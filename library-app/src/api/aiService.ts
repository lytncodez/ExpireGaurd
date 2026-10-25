/**
 * AI Assistant service: talks to the ExpireGuard backend.
 * Answers, seasonal plans and conversation history all come from the server
 * (/ai/chat, /ai/conversations, /ai/seasonal-plan); nothing is computed or
 * stored in the browser, so the AI uses the pharmacy's real data and API key.
 */

import { api } from './client';

export interface SeasonalProductItem {
  productId: string;
  product: string;
  currentStock: number;
  recommendedOrderQty: number;
  soldLastSeason: number;
  sellThroughSpeed: string;
  confidence: 'High' | 'Medium' | 'Low';
  why: string;
  costGhs: number;
  coldStart: boolean;
}

export interface SeasonalCardData {
  seasonName: string;
  dateRange: string;
  products: SeasonalProductItem[];
  estimatedTotalCostGhs: number;
  disclaimer: string;
  coldStartNote?: string;
}

export interface MiniChartData {
  type: 'bar' | 'line';
  title: string;
  labels: string[];
  values: number[];
  unit?: string;
  color?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  evidence?: Array<{ label: string; value: any; source: string }>;
  dataSourcesUsed?: string[];
  toolsInvoked?: string[];
  seasonalCard?: SeasonalCardData;
  charts?: MiniChartData[];
  followUpSuggestions?: string[];
  isPinned?: boolean;
  /** 'advice' = verified data plus general business knowledge */
  answerMode?: 'data' | 'advice';
  /** A file shared with the assistant (shown as a card with Import / Keep buttons) */
  sharedFile?: SharedFile;
}

export type SharedFileKind = 'INVENTORY' | 'SALES_HISTORY' | 'OTHER';
export type SharedFileStatus = 'PENDING' | 'KEPT' | 'IMPORTED';

export interface SharedFile {
  id: string;
  filename: string;
  fileType: string;
  kind: SharedFileKind;
  status: SharedFileStatus;
  rowCount: number;
  columns: string[];
  summary: Record<string, unknown> & { description?: string; suggested_action?: 'IMPORT' | 'KEEP' };
  canImport: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  isPinned: boolean;
  messages: ChatMessage[];
}

export const SUGGESTED_STARTERS = [
  {
    id: 'starter-1',
    icon: '🌧️',
    title: 'Seasonal Stock-Up',
    prompt: 'What should I stock up on this season?',
    description: 'Procurement advice for upcoming rainy/malaria season.',
  },
  {
    id: 'starter-2',
    icon: '⏳',
    title: 'Near-Expiry Runout',
    prompt: 'What is expiring in the next 60 days?',
    description: 'Identify batches at risk of spoilage before sale.',
  },
  {
    id: 'starter-3',
    icon: '⚡',
    title: 'Fast Movers',
    prompt: 'Which products sell fastest right now?',
    description: 'High velocity lines requiring stockout protection.',
  },
  {
    id: 'starter-4',
    icon: '🛑',
    title: 'Stop Reordering',
    prompt: 'What should I stop reordering?',
    description: 'Overstocked products with slow shelf turnover.',
  },
  {
    id: 'starter-5',
    icon: '🚚',
    title: 'Supplier Short-Dated',
    prompt: 'Which suppliers send near-expiry stock?',
    description: 'Quality audit on received batches and return RMA windows.',
  },
  {
    id: 'starter-6',
    icon: '💰',
    title: 'Stock Value at Risk',
    prompt: 'How much stock value am I about to lose?',
    description: 'Monetary quantification of critical expiring batches.',
  },
  {
    id: 'starter-7',
    icon: '📊',
    title: 'Weekly Summary',
    prompt: 'Summarise this week’s activity',
    description: 'Recap of sales, dispensing pace, and inventory adjustments.',
  },
  {
    id: 'starter-8',
    icon: '🏷️',
    title: 'Discount & Clearance',
    prompt: 'What should I discount or sell first?',
    description: 'FEFO priority items suited for immediate promotional markdown.',
  },
];

export const QUICK_PRESETS = [
  { label: 'Daily summary', prompt: 'Give me a daily summary of stock and open alerts.' },
  { label: 'Weekly report', prompt: 'Summarise this week’s activity and inventory health.' },
  { label: 'Seasonal buying plan', prompt: 'What should I stock up on this season?' },
  { label: 'Reorder advice', prompt: 'What should I stop reordering and what needs replenishment?' },
  { label: 'Supplier review', prompt: 'Which suppliers send near-expiry stock and what returns are open?' },
];

// ─── Backend shapes (snake_case) ─────────────────────────────────────────────

interface ApiSeasonalProduct {
  product_id: string;
  product: string;
  current_stock: number;
  recommended_order_qty: number;
  sold_last_season: number;
  sell_through_speed: string;
  confidence: 'High' | 'Medium' | 'Low';
  why: string;
  cost_ghs: number;
  cold_start: boolean;
}

interface ApiSeasonalCard {
  season_name: string;
  date_range: string;
  products: ApiSeasonalProduct[];
  estimated_total_cost_ghs: number;
  disclaimer: string;
  cold_start_note: string | null;
}

interface ApiEvidence {
  label: string;
  value: unknown;
  source: string;
}

interface ApiChatResponse {
  conversation_id: string;
  message_id: string;
  intent: string;
  answer: string;
  evidence: ApiEvidence[];
  insufficient_evidence: boolean;
  follow_up_suggestions: string[];
  grounded: boolean;
  fallback_used: boolean;
  provider: string;
  model: string;
  seasonal_card: ApiSeasonalCard | null;
  data_sources_used: string[];
  tools_invoked: string[];
  charts: Record<string, unknown>[];
  answer_mode?: 'data' | 'advice';
}

interface ApiConversation {
  id: string;
  title: string | null;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
}

interface ApiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Mapping helpers ─────────────────────────────────────────────────────────

function timeLabel(iso?: string): string {
  const d = iso ? new Date(iso) : new Date();
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function toSeasonalCard(card: ApiSeasonalCard | null | undefined): SeasonalCardData | undefined {
  if (!card) return undefined;
  return {
    seasonName: card.season_name,
    dateRange: card.date_range,
    products: (card.products || []).map(p => ({
      productId: p.product_id,
      product: p.product,
      currentStock: p.current_stock,
      recommendedOrderQty: p.recommended_order_qty,
      soldLastSeason: p.sold_last_season,
      sellThroughSpeed: p.sell_through_speed,
      confidence: p.confidence,
      why: p.why,
      costGhs: p.cost_ghs,
      coldStart: p.cold_start,
    })),
    estimatedTotalCostGhs: card.estimated_total_cost_ghs,
    disclaimer: card.disclaimer,
    coldStartNote: card.cold_start_note ?? undefined,
  };
}

/** Only well-formed charts are shown; anything else from the server is ignored. */
function toCharts(charts: Record<string, unknown>[] | undefined): MiniChartData[] | undefined {
  const valid = (charts || []).filter(
    (c): c is Record<string, unknown> & MiniChartData =>
      (c.type === 'bar' || c.type === 'line') && Array.isArray(c.labels) && Array.isArray(c.values) && typeof c.title === 'string',
  );
  return valid.length ? valid : undefined;
}

function footnote(res: Pick<ApiChatResponse, 'insufficient_evidence' | 'fallback_used'>): string {
  if (res.insufficient_evidence) return '\n\n_The data available is not enough to answer this fully._';
  return '';
}

function toConversation(c: ApiConversation, messages: ChatMessage[] = []): Conversation {
  return {
    id: c.id,
    title: c.title || 'New Conversation',
    createdAt: c.created_at,
    updatedAt: c.updated_at,
    isPinned: c.is_pinned,
    messages,
  };
}

function fromStoredMessage(m: ApiMessage): ChatMessage {
  const meta = m.metadata || {};
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    timestamp: timeLabel(m.created_at),
    evidence: Array.isArray(meta.evidence) ? (meta.evidence as ChatMessage['evidence']) : undefined,
    dataSourcesUsed: Array.isArray(meta.data_sources_used) ? (meta.data_sources_used as string[]) : undefined,
    toolsInvoked: Array.isArray(meta.tools_invoked) ? (meta.tools_invoked as string[]) : undefined,
    seasonalCard: toSeasonalCard(meta.seasonal_card as ApiSeasonalCard | null | undefined),
    followUpSuggestions: Array.isArray(meta.follow_up_suggestions) ? (meta.follow_up_suggestions as string[]) : undefined,
    charts: toCharts(Array.isArray(meta.charts) ? (meta.charts as Record<string, unknown>[]) : undefined),
    answerMode: meta.answer_mode === 'advice' ? 'advice' : 'data',
  };
}

// ─── API calls ───────────────────────────────────────────────────────────────

export interface ChatResult {
  conversationId: string;
  message: ChatMessage;
}

/** Sends a question to the backend AI. Omit conversationId to start a new conversation. */
export async function sendChatMessage(message: string, conversationId?: string | null): Promise<ChatResult> {
  const res = await api<ApiChatResponse>('/ai/chat', {
    method: 'POST',
    body: { message, conversation_id: conversationId || undefined },
  });
  return {
    conversationId: res.conversation_id,
    message: {
      id: res.message_id,
      role: 'assistant',
      content: res.answer + footnote(res),
      timestamp: timeLabel(),
      evidence: res.evidence.map(e => ({ label: e.label, value: e.value, source: e.source })),
      dataSourcesUsed: res.data_sources_used,
      toolsInvoked: res.tools_invoked,
      seasonalCard: toSeasonalCard(res.seasonal_card),
      charts: toCharts(res.charts),
      followUpSuggestions: res.follow_up_suggestions,
      answerMode: res.answer_mode === 'advice' ? 'advice' : 'data',
    },
  };
}

export async function listConversations(): Promise<Conversation[]> {
  const page = await api<{ items: ApiConversation[] }>('/ai/conversations?page_size=50');
  return page.items.map(c => toConversation(c));
}

export async function loadConversation(id: string): Promise<Conversation> {
  const detail = await api<ApiConversation & { messages: ApiMessage[] }>(`/ai/conversations/${id}`);
  const messages = [...detail.messages]
    // A question and its answer are saved together and can share a timestamp: question first.
    .sort((a, b) => a.created_at.localeCompare(b.created_at) || (a.role === b.role ? 0 : a.role === 'user' ? -1 : 1))
    .map(fromStoredMessage);
  return toConversation(detail, messages);
}

export async function updateConversation(id: string, changes: { title?: string; isPinned?: boolean }): Promise<void> {
  await api(`/ai/conversations/${id}`, {
    method: 'PATCH',
    body: { title: changes.title, is_pinned: changes.isPinned },
  });
}

export async function deleteConversation(id: string): Promise<void> {
  await api(`/ai/conversations/${id}`, { method: 'DELETE' });
}

export async function fetchSeasonalPlan(season?: 'RAINY' | 'HARMATTAN' | 'BACK_TO_SCHOOL'): Promise<SeasonalCardData | undefined> {
  const query = season ? `?season=${season}` : '';
  return toSeasonalCard(await api<ApiSeasonalCard>(`/ai/seasonal-plan${query}`, { method: 'POST' }));
}

// ─── Files shared with the assistant ────────────────────────────────────────

interface ApiSharedFile {
  id: string;
  filename: string;
  file_type: string;
  kind: SharedFileKind;
  status: SharedFileStatus;
  row_count: number;
  columns: string[];
  summary: SharedFile['summary'];
  can_import: boolean;
  created_at: string;
}

function toSharedFile(f: ApiSharedFile): SharedFile {
  return {
    id: f.id,
    filename: f.filename,
    fileType: f.file_type,
    kind: f.kind,
    status: f.status,
    rowCount: f.row_count,
    columns: f.columns,
    summary: f.summary || {},
    canImport: f.can_import,
    createdAt: f.created_at,
  };
}

/** Upload an Excel (.xlsx) or CSV file. It is analysed but nothing changes in stock yet. */
export async function uploadAiFile(file: File): Promise<SharedFile> {
  const form = new FormData();
  form.append('file', file);
  return toSharedFile(await api<ApiSharedFile>('/ai/files', { method: 'POST', form }));
}

export async function listAiFiles(): Promise<SharedFile[]> {
  return (await api<ApiSharedFile[]>('/ai/files')).map(toSharedFile);
}

export async function keepAiFile(id: string): Promise<SharedFile> {
  return toSharedFile(await api<ApiSharedFile>(`/ai/files/${id}/keep`, { method: 'POST' }));
}

export interface ImportFileResult {
  file: SharedFile;
  message: string;
  batchesCreated: number;
}

export async function importAiFile(id: string): Promise<ImportFileResult> {
  const res = await api<{ dataset: ApiSharedFile; message: string; batches_created: number }>(
    `/ai/files/${id}/import`,
    { method: 'POST' },
  );
  return { file: toSharedFile(res.dataset), message: res.message, batchesCreated: res.batches_created };
}

export async function deleteAiFile(id: string): Promise<void> {
  await api(`/ai/files/${id}`, { method: 'DELETE' });
}
