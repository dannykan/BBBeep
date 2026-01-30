'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Search,
  Plus,
  Trash2,
  Edit,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type ProfanityCategory = 'PROFANITY' | 'THREAT' | 'HARASSMENT' | 'DISCRIMINATION';
type ProfanitySeverity = 'LOW' | 'MEDIUM' | 'HIGH';

interface ProfanityWord {
  id: string;
  word: string;
  category: ProfanityCategory;
  severity: ProfanitySeverity;
  isActive: boolean;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  total: number;
  active: number;
  byCategory: Record<string, number>;
}

const CATEGORY_LABELS: Record<ProfanityCategory, string> = {
  PROFANITY: '髒話/粗話',
  THREAT: '威脅性言語',
  HARASSMENT: '騷擾性言語',
  DISCRIMINATION: '歧視性言語',
};

const SEVERITY_LABELS: Record<ProfanitySeverity, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
};

const SEVERITY_COLORS: Record<ProfanitySeverity, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  HIGH: 'bg-red-100 text-red-700',
};

const CATEGORY_COLORS: Record<ProfanityCategory, string> = {
  PROFANITY: 'bg-purple-100 text-purple-700',
  THREAT: 'bg-red-100 text-red-700',
  HARASSMENT: 'bg-orange-100 text-orange-700',
  DISCRIMINATION: 'bg-pink-100 text-pink-700',
};

export default function ProfanityPage() {
  const router = useRouter();
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [words, setWords] = useState<ProfanityWord[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [version, setVersion] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<ProfanityCategory | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<ProfanitySeverity | 'all'>('all');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');

  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingWord, setEditingWord] = useState<ProfanityWord | null>(null);

  // Form states
  const [formWord, setFormWord] = useState('');
  const [formCategory, setFormCategory] = useState<ProfanityCategory>('PROFANITY');
  const [formSeverity, setFormSeverity] = useState<ProfanitySeverity>('MEDIUM');
  const [formNote, setFormNote] = useState('');

  // Batch add
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState(false);
  const [batchWords, setBatchWords] = useState('');
  const [batchCategory, setBatchCategory] = useState<ProfanityCategory>('PROFANITY');
  const [batchSeverity, setBatchSeverity] = useState<ProfanitySeverity>('MEDIUM');

  useEffect(() => {
    const savedToken = localStorage.getItem('admin_token');
    if (!savedToken) {
      router.push('/BBBeepadmin2026');
      return;
    }
    setAdminToken(savedToken);
  }, [router]);

  const loadData = useCallback(async () => {
    if (!adminToken) return;

    setIsLoading(true);
    try {
      const params: any = {};
      if (filterCategory !== 'all') params.category = filterCategory;
      if (filterSeverity !== 'all') params.severity = filterSeverity;
      if (filterActive !== 'all') params.isActive = filterActive === 'active';
      if (searchQuery) params.search = searchQuery;

      const [wordsRes, versionRes] = await Promise.all([
        axios.get(`${API_URL}/profanity/admin`, {
          params,
          headers: { 'x-admin-token': adminToken },
        }),
        axios.get(`${API_URL}/profanity/version`),
      ]);

      setWords(wordsRes.data.words);
      setStats(wordsRes.data.stats);
      setVersion(versionRes.data.version);
    } catch (error: any) {
      if (error.response?.status === 401) {
        localStorage.removeItem('admin_token');
        router.push('/BBBeepadmin2026');
      } else {
        toast.error('載入失敗');
      }
    } finally {
      setIsLoading(false);
    }
  }, [adminToken, filterCategory, filterSeverity, filterActive, searchQuery, router]);

  useEffect(() => {
    if (adminToken) {
      loadData();
    }
  }, [adminToken, loadData]);

  const handleAdd = async () => {
    if (!formWord.trim()) {
      toast.error('請輸入詞彙');
      return;
    }

    try {
      await axios.post(
        `${API_URL}/profanity/admin`,
        {
          word: formWord.trim(),
          category: formCategory,
          severity: formSeverity,
          note: formNote || undefined,
        },
        { headers: { 'x-admin-token': adminToken } }
      );

      toast.success('新增成功');
      setIsAddDialogOpen(false);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '新增失敗');
    }
  };

  const handleEdit = async () => {
    if (!editingWord || !formWord.trim()) return;

    try {
      await axios.put(
        `${API_URL}/profanity/admin/${editingWord.id}`,
        {
          word: formWord.trim(),
          category: formCategory,
          severity: formSeverity,
          note: formNote || undefined,
        },
        { headers: { 'x-admin-token': adminToken } }
      );

      toast.success('更新成功');
      setIsEditDialogOpen(false);
      setEditingWord(null);
      resetForm();
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新失敗');
    }
  };

  const handleDelete = async (word: ProfanityWord) => {
    if (!confirm(`確定要刪除「${word.word}」嗎？`)) return;

    try {
      await axios.delete(`${API_URL}/profanity/admin/${word.id}`, {
        headers: { 'x-admin-token': adminToken },
      });

      toast.success('刪除成功');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '刪除失敗');
    }
  };

  const handleToggle = async (word: ProfanityWord) => {
    try {
      await axios.put(
        `${API_URL}/profanity/admin/${word.id}/toggle`,
        {},
        { headers: { 'x-admin-token': adminToken } }
      );

      toast.success(word.isActive ? '已停用' : '已啟用');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失敗');
    }
  };

  const handleBatchAdd = async () => {
    const wordList = batchWords
      .split('\n')
      .map((w) => w.trim())
      .filter((w) => w.length > 0);

    if (wordList.length === 0) {
      toast.error('請輸入詞彙');
      return;
    }

    try {
      const result = await axios.post(
        `${API_URL}/profanity/admin/import`,
        {
          words: wordList.map((w) => ({
            word: w,
            category: batchCategory,
            severity: batchSeverity,
          })),
        },
        { headers: { 'x-admin-token': adminToken } }
      );

      toast.success(`新增 ${result.data.created} 個，跳過 ${result.data.skipped} 個`);
      setIsBatchDialogOpen(false);
      setBatchWords('');
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '批量新增失敗');
    }
  };

  const openEditDialog = (word: ProfanityWord) => {
    setEditingWord(word);
    setFormWord(word.word);
    setFormCategory(word.category);
    setFormSeverity(word.severity);
    setFormNote(word.note || '');
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormWord('');
    setFormCategory('PROFANITY');
    setFormSeverity('MEDIUM');
    setFormNote('');
  };

  // Filter words locally for instant search
  const filteredWords = words.filter((w) => {
    if (searchQuery && !w.word.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/BBBeepadmin2026')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">詞庫管理</h1>
              <p className="text-xs text-muted-foreground">
                版本: {version} | 共 {stats?.total || 0} 個詞彙 ({stats?.active || 0} 個啟用)
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              重新整理
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsBatchDialogOpen(true)}>
              批量新增
            </Button>
            <Button size="sm" onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新增詞彙
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">髒話/粗話</p>
            <p className="text-2xl font-bold text-purple-600">{stats?.byCategory?.PROFANITY || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">威脅性言語</p>
            <p className="text-2xl font-bold text-red-600">{stats?.byCategory?.THREAT || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">騷擾性言語</p>
            <p className="text-2xl font-bold text-orange-600">{stats?.byCategory?.HARASSMENT || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">歧視性言語</p>
            <p className="text-2xl font-bold text-pink-600">{stats?.byCategory?.DISCRIMINATION || 0}</p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">總計啟用</p>
            <p className="text-2xl font-bold text-primary">{stats?.active || 0}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜尋詞彙..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select
              value={filterCategory}
              onValueChange={(v) => setFilterCategory(v as ProfanityCategory | 'all')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="類別" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部類別</SelectItem>
                <SelectItem value="PROFANITY">髒話/粗話</SelectItem>
                <SelectItem value="THREAT">威脅性言語</SelectItem>
                <SelectItem value="HARASSMENT">騷擾性言語</SelectItem>
                <SelectItem value="DISCRIMINATION">歧視性言語</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterSeverity}
              onValueChange={(v) => setFilterSeverity(v as ProfanitySeverity | 'all')}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="嚴重度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="HIGH">高</SelectItem>
                <SelectItem value="MEDIUM">中</SelectItem>
                <SelectItem value="LOW">低</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterActive}
              onValueChange={(v) => setFilterActive(v as 'all' | 'active' | 'inactive')}
            >
              <SelectTrigger className="w-32">
                <SelectValue placeholder="狀態" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="active">啟用</SelectItem>
                <SelectItem value="inactive">停用</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Words Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">詞彙</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">類別</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">嚴重度</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">狀態</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">備註</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      載入中...
                    </td>
                  </tr>
                ) : filteredWords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      沒有找到詞彙
                    </td>
                  </tr>
                ) : (
                  filteredWords.map((word) => (
                    <tr key={word.id} className={!word.isActive ? 'opacity-50' : ''}>
                      <td className="px-4 py-3 font-medium">{word.word}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${CATEGORY_COLORS[word.category]}`}>
                          {CATEGORY_LABELS[word.category]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${SEVERITY_COLORS[word.severity]}`}>
                          {SEVERITY_LABELS[word.severity]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            word.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {word.isActive ? '啟用' : '停用'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[200px] truncate">
                        {word.note || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggle(word)}
                            title={word.isActive ? '停用' : '啟用'}
                          >
                            {word.isActive ? (
                              <ToggleRight className="h-4 w-4 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(word)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(word)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增詞彙</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>詞彙</Label>
              <Input
                value={formWord}
                onChange={(e) => setFormWord(e.target.value)}
                placeholder="輸入詞彙"
              />
            </div>
            <div>
              <Label>類別</Label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as ProfanityCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFANITY">髒話/粗話</SelectItem>
                  <SelectItem value="THREAT">威脅性言語</SelectItem>
                  <SelectItem value="HARASSMENT">騷擾性言語</SelectItem>
                  <SelectItem value="DISCRIMINATION">歧視性言語</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>嚴重度</Label>
              <Select value={formSeverity} onValueChange={(v) => setFormSeverity(v as ProfanitySeverity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">低</SelectItem>
                  <SelectItem value="MEDIUM">中</SelectItem>
                  <SelectItem value="HIGH">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>備註（選填）</Label>
              <Input value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="備註說明" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAdd}>新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>編輯詞彙</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>詞彙</Label>
              <Input
                value={formWord}
                onChange={(e) => setFormWord(e.target.value)}
                placeholder="輸入詞彙"
              />
            </div>
            <div>
              <Label>類別</Label>
              <Select value={formCategory} onValueChange={(v) => setFormCategory(v as ProfanityCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROFANITY">髒話/粗話</SelectItem>
                  <SelectItem value="THREAT">威脅性言語</SelectItem>
                  <SelectItem value="HARASSMENT">騷擾性言語</SelectItem>
                  <SelectItem value="DISCRIMINATION">歧視性言語</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>嚴重度</Label>
              <Select value={formSeverity} onValueChange={(v) => setFormSeverity(v as ProfanitySeverity)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">低</SelectItem>
                  <SelectItem value="MEDIUM">中</SelectItem>
                  <SelectItem value="HIGH">高</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>備註（選填）</Label>
              <Input value={formNote} onChange={(e) => setFormNote(e.target.value)} placeholder="備註說明" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEdit}>儲存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Add Dialog */}
      <Dialog open={isBatchDialogOpen} onOpenChange={setIsBatchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>批量新增詞彙</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>詞彙列表（每行一個）</Label>
              <textarea
                className="w-full h-40 p-3 border rounded-md text-sm"
                value={batchWords}
                onChange={(e) => setBatchWords(e.target.value)}
                placeholder="靠北&#10;白目&#10;智障&#10;..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>類別</Label>
                <Select value={batchCategory} onValueChange={(v) => setBatchCategory(v as ProfanityCategory)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PROFANITY">髒話/粗話</SelectItem>
                    <SelectItem value="THREAT">威脅性言語</SelectItem>
                    <SelectItem value="HARASSMENT">騷擾性言語</SelectItem>
                    <SelectItem value="DISCRIMINATION">歧視性言語</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>嚴重度</Label>
                <Select value={batchSeverity} onValueChange={(v) => setBatchSeverity(v as ProfanitySeverity)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">低</SelectItem>
                    <SelectItem value="MEDIUM">中</SelectItem>
                    <SelectItem value="HIGH">高</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBatchDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleBatchAdd}>批量新增</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
