import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { memoryStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { R2Service } from '../common/storage/r2.service';
import { POINTS_CONFIG } from '../config/points.config';
import OpenAI, { toFile } from 'openai';

// 允許的圖片類型
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// 允許的語音類型
const ALLOWED_VOICE_TYPES = ['audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/mpeg', 'audio/wav'];
const MAX_VOICE_SIZE = 2 * 1024 * 1024; // 2MB

@ApiTags('Upload')
@Controller('upload')
export class UploadController {
  private openai: OpenAI | null = null;

  constructor(
    private readonly r2Service: R2Service,
    private readonly configService: ConfigService,
  ) {
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      this.openai = new OpenAI({ apiKey: openaiKey });
    }
  }

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '上傳圖片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_FILE_SIZE,
      },
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
          callback(new BadRequestException('只允許上傳圖片檔案（JPG、PNG、GIF、WebP）'), false);
          return;
        }
        callback(null, true);
      },
    }),
  )
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('請選擇要上傳的圖片');
    }

    // 將圖片轉換為 base64 data URL
    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    const filename = `${uuidv4()}${extname(file.originalname)}`;

    return {
      url: dataUrl,
      filename: filename,
      originalname: file.originalname,
      size: file.size,
    };
  }

  @Post('voice')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '上傳語音檔案' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_VOICE_SIZE,
      },
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_VOICE_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException('只允許上傳語音檔案（M4A、MP3、WAV）'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async uploadVoice(@UploadedFile() file: Express.Multer.File) {
    // 檢查語音功能是否啟用
    if (!POINTS_CONFIG.voice.enabled) {
      throw new BadRequestException('語音功能目前未啟用');
    }

    if (!file) {
      throw new BadRequestException('請選擇要上傳的語音檔案');
    }

    // 檢查 R2 是否已設定
    if (!this.r2Service.isConfigured()) {
      throw new BadRequestException('語音儲存服務尚未設定');
    }

    try {
      const result = await this.r2Service.uploadVoice(
        file.buffer,
        file.mimetype,
        file.originalname,
      );

      return {
        url: result.url,
        key: result.key,
        size: result.size,
        originalname: file.originalname,
      };
    } catch (error) {
      throw new BadRequestException('上傳語音檔案失敗');
    }
  }

  @Post('transcribe')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '語音轉文字（Whisper API）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: MAX_VOICE_SIZE,
      },
      fileFilter: (req, file, callback) => {
        if (!ALLOWED_VOICE_TYPES.includes(file.mimetype)) {
          callback(
            new BadRequestException('只允許上傳語音檔案（M4A、MP3、WAV）'),
            false,
          );
          return;
        }
        callback(null, true);
      },
    }),
  )
  async transcribeVoice(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('請選擇要轉文字的語音檔案');
    }

    if (!this.openai) {
      throw new BadRequestException('語音轉文字服務未配置');
    }

    try {
      // 使用 OpenAI SDK 的 toFile 將 buffer 轉換為可上傳的檔案格式
      const audioFile = await toFile(file.buffer, file.originalname, {
        type: file.mimetype,
      });

      const transcription = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        language: 'zh',
        // 使用 prompt 引導輸出繁體中文，包含台灣交通情境常用詞彙
        prompt: '這是台灣人的繁體中文語音，關於行車或交通情況。常見詞彙：切過來、逼車、擦撞、違規、超車、併排、雙黃線、紅燈、綠燈、斑馬線、人行道、車道、迴轉、待轉、機車、汽車、計程車、公車、捷運、高鐵。請使用繁體中文轉錄。',
      });

      // 簡體轉繁體（常見字詞對照）
      let text = transcription.text;
      text = this.simplifiedToTraditional(text);

      return {
        text,
      };
    } catch (error) {
      console.error('Transcription error:', error);
      throw new BadRequestException('語音轉文字失敗');
    }
  }

  /**
   * 簡體中文轉繁體中文
   * 常見字詞對照表（去除重複）
   */
  private simplifiedToTraditional(text: string): string {
    const mapping: Record<string, string> = {
      // 常見簡繁對照（已去重）
      '车': '車', '东': '東', '发': '發', '国': '國', '会': '會',
      '机': '機', '经': '經', '开': '開', '来': '來', '里': '裡',
      '马': '馬', '门': '門', '们': '們', '时': '時', '说': '說',
      '头': '頭', '为': '為', '问': '問', '学': '學', '样': '樣',
      '业': '業', '应': '應', '长': '長', '这': '這', '种': '種',
      '关': '關', '对': '對', '电': '電', '动': '動', '儿': '兒',
      '过': '過', '还': '還', '后': '後', '欢': '歡', '几': '幾',
      '见': '見', '进': '進', '乐': '樂', '两': '兩', '么': '麼',
      '没': '沒', '气': '氣', '让': '讓', '认': '認', '实': '實',
      '听': '聽', '万': '萬', '无': '無', '现': '現', '写': '寫',
      '语': '語', '运': '運', '着': '著', '只': '隻', '钟': '鐘',
      '从': '從', '当': '當', '点': '點', '给': '給', '号': '號',
      '华': '華', '话': '話', '间': '間', '觉': '覺', '离': '離',
      '脑': '腦', '请': '請', '谁': '誰', '岁': '歲', '它': '牠',
      '条': '條', '图': '圖', '网': '網', '谢': '謝', '兴': '興',
      '医': '醫', '与': '與', '远': '遠', '张': '張', '专': '專',
      '总': '總', '边': '邊', '别': '別', '产': '產', '厂': '廠',
      '处': '處', '达': '達', '带': '帶', '单': '單', '导': '導',
      '灯': '燈', '订': '訂', '断': '斷', '队': '隊', '尔': '爾',
      '飞': '飛', '风': '風', '复': '復', '干': '乾', '刚': '剛',
      '个': '個', '观': '觀', '广': '廣', '规': '規', '红': '紅',
      '划': '劃', '坏': '壞', '换': '換', '黄': '黃', '汇': '匯',
      '货': '貨', '际': '際', '价': '價', '坚': '堅', '检': '檢',
      '简': '簡', '将': '將', '讲': '講', '节': '節', '结': '結',
      '紧': '緊', '仅': '僅', '举': '舉', '据': '據', '绝': '絕',
      '军': '軍', '课': '課', '况': '況', '蓝': '藍', '类': '類',
      '历': '歷', '联': '聯', '临': '臨', '领': '領', '龙': '龍',
      '论': '論', '罗': '羅', '绿': '綠', '满': '滿', '贸': '貿',
      '难': '難', '鸟': '鳥', '农': '農', '盘': '盤', '评': '評',
      '齐': '齊', '签': '簽', '钱': '錢', '亲': '親', '轻': '輕',
      '区': '區', '热': '熱', '荣': '榮', '赛': '賽', '伤': '傷',
      '设': '設', '师': '師', '识': '識', '属': '屬', '术': '術',
      '树': '樹', '双': '雙', '顺': '順', '丝': '絲', '苏': '蘇',
      '虽': '雖', '随': '隨', '态': '態', '谈': '談', '铁': '鐵',
      '统': '統', '团': '團', '卫': '衛', '温': '溫', '闻': '聞',
      '务': '務', '习': '習', '细': '細', '线': '線', '选': '選',
      '严': '嚴', '验': '驗', '杨': '楊', '养': '養', '仪': '儀',
      '义': '義', '艺': '藝', '阴': '陰', '银': '銀', '营': '營',
      '拥': '擁', '优': '優', '邮': '郵', '鱼': '魚', '园': '園',
      '约': '約', '云': '雲', '杂': '雜', '赞': '讚', '暂': '暫',
      '战': '戰', '涨': '漲', '针': '針', '镇': '鎮', '证': '證',
      '郑': '鄭', '职': '職', '执': '執', '质': '質', '众': '眾',
      '装': '裝', '资': '資', '综': '綜', '组': '組', '办': '辦',
      '标': '標', '参': '參', '层': '層', '称': '稱', '冲': '衝',
      '传': '傳', '辞': '辭', '错': '錯', '担': '擔', '党': '黨',
      '递': '遞', '读': '讀', '独': '獨', '额': '額', '费': '費',
      '冈': '岡', '纲': '綱', '钢': '鋼', '购': '購', '顾': '顧',
      '馆': '館', '贯': '貫', '轨': '軌', '柜': '櫃', '确': '確',
      '舍': '捨', '审': '審', '圣': '聖', '胜': '勝', '视': '視',
      '适': '適', '兽': '獸', '输': '輸', '数': '數', '帅': '帥',
      '虑': '慮', '纳': '納', '酿': '釀', '欧': '歐', '庞': '龐',
      '赔': '賠', '喷': '噴', '凭': '憑', '启': '啟', '迁': '遷',
      '墙': '牆', '桥': '橋', '窃': '竊', '庆': '慶', '穷': '窮',
      '权': '權', '劝': '勸', '绕': '繞', '软': '軟', '锐': '銳',
      '闰': '閏', '洒': '灑', '扫': '掃', '杀': '殺', '纱': '紗',
      '筛': '篩', '烧': '燒', '绍': '紹', '赊': '賒', '摄': '攝',
      '渗': '滲', '声': '聲', '绳': '繩', '湿': '濕', '势': '勢',
      '释': '釋', '枢': '樞', '赎': '贖', '闩': '閂',
    };

    let result = text;
    for (const [simplified, traditional] of Object.entries(mapping)) {
      result = result.split(simplified).join(traditional);
    }
    return result;
  }
}
