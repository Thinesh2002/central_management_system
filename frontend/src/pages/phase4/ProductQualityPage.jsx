import React, { useState } from 'react';
import phase4Api from '../../config/sub_api/phase4_api/phase4Api';
import { Badge, FilterBar, PageShell, PrimaryButton, StatCard, TableCard, usePhase4Page } from './Phase4Shared';

export default function ProductQualityPage() {
  const page = usePhase4Page((filters) => phase4Api.productQuality(filters), { search: '', limit: 30 });
  const [running, setRunning] = useState(false);
  async function recalculate() {
    setRunning(true);
    try { await phase4Api.recalculateProductQuality(); page.reload(); } finally { setRunning(false); }
  }
  return (
    <PageShell title="Product Quality Score" description="Score every SKU by title, category, attributes, images, stock, price and supplier mapping." actions={<PrimaryButton onClick={recalculate} loading={running}>Recalculate</PrimaryButton>}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Checked Products" value={page.data?.summary?.total_products || 0} />
        <StatCard label="Average Score" value={`${Number(page.data?.summary?.avg_score || 0).toFixed(1)}%`} />
        <StatCard label="Bad" value={page.data?.summary?.bad_count || 0} />
        <StatCard label="Needs Work" value={page.data?.summary?.needs_work || 0} />
      </div>
      <FilterBar filters={page.filters} setFilters={page.setFilters} onRefresh={page.reload} loading={page.loading}>
        <select value={page.filters.status || ''} onChange={(e) => page.setFilters((p) => ({ ...p, status: e.target.value, page: 1 }))} className="h-10 rounded-lg border border-slate-700 bg-[#020617] px-3 text-sm"><option value="">All Status</option><option value="excellent">Excellent</option><option value="good">Good</option><option value="needs_work">Needs Work</option><option value="bad">Bad</option></select>
      </FilterBar>
      <TableCard loading={page.loading} error={page.error} rows={page.rows} emptyText="No product quality scores found." columns={[
        { key: 'local_sku', label: 'SKU' },
        { key: 'product_name', label: 'Product' },
        { key: 'score', label: 'Score', render: (row) => `${Number(row.score || 0).toFixed(1)}%` },
        { key: 'image_score', label: 'Image' },
        { key: 'stock_score', label: 'Stock' },
        { key: 'price_score', label: 'Price' },
        { key: 'supplier_score', label: 'Supplier' },
        { key: 'issue_count', label: 'Issues' },
        { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
      ]} />
    </PageShell>
  );
}
