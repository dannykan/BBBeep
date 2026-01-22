'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Car, Bike, Save, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface AIPrompt {
  id: string;
  vehicleType: 'car' | 'scooter';
  category: string;
  prompt: string;
  isActive: boolean;
}

const categories = ['車況提醒', '行車安全', '讚美感謝', '其他情況'];
const vehicleTypes = [
  { value: 'car', label: '汽車', icon: Car },
  { value: 'scooter', label: '機車', icon: Bike },
];

export default function AIPromptsPage() {
  const router = useRouter();
  const [prompts, setPrompts] = useState<AIPrompt[]>([]);
  const [editing, setEditing] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    const token = localStorage.getItem('admin_token');
    if (!token) {
      router.push('/BBBeepadmin2026');
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/admin/ai-prompts`, {
        headers: { 'x-admin-token': token },
      });
      setPrompts(response.data);
      
      // 初始化编辑状态
      const editState: Record<string, string> = {};
      response.data.forEach((p: AIPrompt) => {
        editState[`${p.vehicleType}-${p.category}`] = p.prompt;
      });
      
      // 为所有可能的组合设置默认值（如果不存在）
      vehicleTypes.forEach((vt) => {
        categories.forEach((cat) => {
          const key = `${vt.value}-${cat}`;
          if (!editState[key]) {
            editState[key] = '請將以下文字改寫為更溫和、禮貌的語氣，保持原意但使用更友善的表達方式。只返回改寫後的文字，不要添加任何解釋：\n\n{text}';
          }
        });
      });
      
      setEditing(editState);
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/BBBeepadmin2026');
        toast.error('登入已過期，請重新登入');
      } else {
        toast.error('載入 Prompt 失敗');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (vehicleType: 'car' | 'scooter', category: string) => {
    const token = localStorage.getItem('admin_token');
    const key = `${vehicleType}-${category}`;
    const prompt = editing[key];

    if (!prompt || !prompt.trim()) {
      toast.error('Prompt 不能為空');
      return;
    }

    setIsSaving({ ...isSaving, [key]: true });
    try {
      await axios.put(
        `${API_URL}/admin/ai-prompts`,
        { vehicleType, category, prompt },
        { headers: { 'x-admin-token': token } }
      );
      toast.success('更新成功');
      loadPrompts();
    } catch (error: any) {
      if (error.response?.status === 401) {
        router.push('/BBBeepadmin2026');
        toast.error('登入已過期，請重新登入');
      } else {
        toast.error('更新失敗');
      }
    } finally {
      setIsSaving({ ...isSaving, [key]: false });
    }
  };

  const getPrompt = (vehicleType: 'car' | 'scooter', category: string): string => {
    const key = `${vehicleType}-${category}`;
    return editing[key] || '';
  };

  const setPrompt = (vehicleType: 'car' | 'scooter', category: string, value: string) => {
    const key = `${vehicleType}-${category}`;
    setEditing({ ...editing, [key]: value });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/BBBeepadmin2026')}
              className="p-2 hover:bg-muted/50 rounded transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">AI Prompt 管理</h1>
              <p className="text-xs text-muted-foreground">編輯不同情境的 AI 改寫提示詞</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {isLoading ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">載入中...</p>
          </Card>
        ) : (
          vehicleTypes.map((vt) => (
            <Card key={vt.value} className="p-6">
              <div className="flex items-center gap-2 mb-6">
                <vt.icon className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">{vt.label}</h2>
              </div>

              <div className="space-y-4">
                {categories.map((category) => {
                  const key = `${vt.value}-${category}`;
                  return (
                    <div key={category} className="space-y-2">
                      <Label className="text-sm font-medium">{category}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={getPrompt(vt.value as 'car' | 'scooter', category)}
                          onChange={(e) =>
                            setPrompt(vt.value as 'car' | 'scooter', category, e.target.value)
                          }
                          placeholder="請輸入 Prompt（可使用 {text} 作為文字占位符）"
                          className="flex-1 font-mono text-sm"
                        />
                        <Button
                          onClick={() => handleSave(vt.value as 'car' | 'scooter', category)}
                          disabled={isSaving[key]}
                          size="sm"
                        >
                          <Save className="h-4 w-4 mr-2" />
                          {isSaving[key] ? '儲存中...' : '儲存'}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        提示：使用 <code className="bg-muted px-1 rounded">{'{text}'}</code> 作為用戶輸入文字的占位符
                      </p>
                    </div>
                  );
                })}
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
