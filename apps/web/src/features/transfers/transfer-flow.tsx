'use client';

import { useEffect, useState } from 'react';
import type { Currency, TransferDto } from '@global-wallet/contracts';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Field } from '../../components/ui/field';
import { PageHeader } from '../../components/ui/page-header';
import { formatMoneyMinor } from '../../lib/format/money';
import { createTransfer, listTransfers } from '../../lib/api/transfer-api';

const currencies: Currency[] = ['BRL', 'USD', 'EUR', 'GBP'];

export function TransferFlow() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [currency, setCurrency] = useState<Currency>('BRL');
  const [amount, setAmount] = useState('');
  const [transfers, setTransfers] = useState<TransferDto[]>([]);
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  useEffect(() => { void refresh(); }, []);
  async function refresh() { setTransfers(await listTransfers()); }
  async function submit() {
    setLoading(true); setMessage(undefined);
    try { await createTransfer({ recipientEmail, currency, amountMinor: Math.round(Number(amount) * 100) }); setAmount(''); await refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Erro inesperado.'); }
    finally { setLoading(false); }
  }

  return <div className="wallet-dashboard"><PageHeader eyebrow="Transferência" title="Enviar fundos" description="Transfira saldo disponível para outro usuário cadastrado." /><Card><Field id="recipient" label="E-mail do destinatário" type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} /><label className="field"><span>Moeda</span><select value={currency} onChange={(event) => setCurrency(event.target.value as Currency)}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label><Field id="amount" label="Valor" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /><Button loading={loading} onClick={submit}>Transferir</Button>{message ? <p className="field__error">{message}</p> : null}</Card><Card><h2>Enviadas e recebidas</h2>{transfers.map((transfer) => <p key={transfer.transferId}>{formatMoneyMinor(transfer.currency, transfer.amountMinor)} — {transfer.recipientEmail}</p>)}</Card></div>;
}
