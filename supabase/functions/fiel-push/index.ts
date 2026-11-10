// Avisos (Web Push) do Cliente Fiel.
// Chamada pelo gatilho do banco (pg_net) com ?k=<fiel_config.chave>:
//   evento "novo_pedido"   -> avisa a equipe (push_equipe) que chegou um pedido de resgate
//   evento "pedido_status" -> avisa o cliente (fiel_push) que o pedido foi aprovado ou recusado
// Precisa dos segredos VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY; sem eles, não envia nada (e não dá erro).
import webpush from 'npm:web-push@3.6.7';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const PUB = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const PRIV = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const REST = `${SUPABASE_URL}/rest/v1`;
const H = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' };

async function get(caminho: string): Promise<any[]> {
  const r = await fetch(`${REST}/${caminho}`, { headers: H });
  return r.ok ? await r.json() : [];
}
async function remover(tabela: string, id: string) {
  await fetch(`${REST}/${tabela}?id=eq.${id}`, { method: 'DELETE', headers: H });
}
const primeiro = (n: string) => String(n ?? '').trim().split(/\s+/)[0];

async function enviar(tabela: string, subs: any[], payload: unknown): Promise<number> {
  let ok = 0;
  for (const s of subs) {
    try { await webpush.sendNotification(s.sub, JSON.stringify(payload), { TTL: 86400 }); ok++; }
    catch (e: any) { if (e?.statusCode === 404 || e?.statusCode === 410) await remover(tabela, s.id); else console.log('push falhou', e?.statusCode ?? e); }
  }
  return ok;
}

Deno.serve(async (req) => {
  const k = new URL(req.url).searchParams.get('k') ?? '';
  const cfg = (await get('fiel_config?id=eq.1&select=chave'))[0];
  if (!cfg || !k || k !== cfg.chave) return new Response('negado', { status: 401 });
  if (!PUB || !PRIV) return Response.json({ aviso: 'Sem chaves VAPID: avisos desligados.' });
  webpush.setVapidDetails('https://hub.farmaciabioflora.blog.br', PUB, PRIV);

  const corpo = await req.json().catch(() => ({}));
  const ped = (await get(`fidelidade_pedidos?id=eq.${encodeURIComponent(corpo.pedido_id ?? '')}&select=*,clientes_fidelidade(nome),fidelidade_brindes(nome)`))[0];
  if (!ped) return Response.json({ aviso: 'pedido não encontrado' });
  const brinde = ped.fidelidade_brindes?.nome ?? 'brinde';

  if (corpo.evento === 'novo_pedido') {
    const subs = await get('push_equipe?select=id,sub');
    const n = await enviar('push_equipe', subs, { title: 'Novo pedido de resgate', body: `${primeiro(ped.clientes_fidelidade?.nome)} quer ${brinde} (${ped.pontos} pontos)`, url: 'cliente-fiel.html', tag: 'pedido-' + ped.id });
    return Response.json({ evento: 'novo_pedido', enviados: n });
  }
  if (corpo.evento === 'pedido_status') {
    const subs = await get(`fiel_push?cliente_id=eq.${ped.cliente_id}&ativo=eq.true&select=id,sub`);
    const aprovado = ped.status === 'aprovado';
    const n = await enviar('fiel_push', subs, {
      title: aprovado ? 'Seu brinde foi aprovado! 🎁' : 'Sobre o seu pedido',
      body: aprovado ? `${brinde}: retire na farmácia.${ped.resposta ? ' ' + ped.resposta : ''}` : `Não foi possível liberar ${brinde}.${ped.resposta ? ' ' + ped.resposta : ''}`,
      url: 'fiel.html', tag: 'pedido-' + ped.id });
    return Response.json({ evento: 'pedido_status', enviados: n });
  }
  return Response.json({ aviso: 'evento desconhecido' });
});
