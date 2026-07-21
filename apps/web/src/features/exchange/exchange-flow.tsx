'use client';

import { useState } from 'react';
import type { Currency, ExchangeConversionDto, ExchangeQuoteDto } from '@global-wallet/contracts';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { Field } from '../../components/ui/field';
import { PageHeader } from '../../components/ui/page-header';
import { formatMoneyMinor } from '../../lib/format/money';
import { createExchangeQuote, executeExchangeConversion } from '../../lib/api/exchange-api';

const currencies: Currency[] = ['BRL', 'USD', 'EUR', 'GBP'];

export function ExchangeFlow() {
  const [sourceCurrency, setSourceCurrency] = useState<Currency>('BRL');
  const [targetCurrency, setTargetCurrency] = useState<Currency>('USD');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<ExchangeQuoteDto>();
  const [conversion, setConversion] = useState<ExchangeConversionDto>();
  const [message, setMessage] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function quoteNow() { setLoading(true); setMessage(undefined); try { setQuote(await createExchangeQuote({ sourceCurrency, targetCurrency, sourceAmountMinor: Math.round(Number(amount) * 100) })); } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro inesperado.'); } finally { setLoading(false); } }
  async function execute() { if (!quote) return; setLoading(true); setMessage(undefined); try { setConversion(await executeExchangeConversion(quote.quoteId)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Erro inesperado.'); } finally { setLoading(false); } }

  return <div className="wallet-dashboard"><PageHeader eyebrow="Câmbio" title="Converter saldo" description="A cotação é persistida por 5 minutos e a execução usa a taxa salva." /><Card><label className="field"><span>Origem</span><select value={sourceCurrency} onChange={(event) => setSourceCurrency(event.target.value as Currency)}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Destino</span><select value={targetCurrency} onChange={(event) => setTargetCurrency(event.target.value as Currency)}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></label><Field id="amount" label="Valor de origem" type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} /><Button loading={loading} onClick={quoteNow}>Cotar</Button>{message ? <p className="field__error">{message}</p> : null}</Card>{quote ? <Card><h2>Prévia</h2><p>{formatMoneyMinor(quote.sourceCurrency, quote.sourceAmountMinor)} → {formatMoneyMinor(quote.targetCurrency, quote.targetAmountMinor)}</p><p>Taxa {quote.rate} via {quote.provider}</p><Button loading={loading} onClick={execute}>Executar câmbio</Button></Card> : null}{conversion ? <Card><h2>Recibo</h2><p>Conversão {conversion.conversionId} concluída.</p></Card> : null}</div>;
}
