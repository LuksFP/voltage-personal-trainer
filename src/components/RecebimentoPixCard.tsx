"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/lib/auth";
import {
  gerarPixCopiaECola,
  normalizarChavePix,
  rotuloTipoChave,
  TIPOS_CHAVE_PIX,
  type TipoChavePix,
} from "@/lib/pix";
import { Badge, Button, Card, Field, Input, Select } from "./ui";
import { WalletIcon } from "./icons";

/**
 * Onde o personal cadastra a chave Pix. Sem isso o botão "Cobrar no Pix" do
 * financeiro não tem o que gerar — por isso o card avisa em vez de sumir.
 */
export function RecebimentoPixCard() {
  const { personal, atualizarPerfil } = useAuth();

  const [chave, setChave] = useState(personal?.pixChave ?? "");
  const [tipo, setTipo] = useState<TipoChavePix | "auto">(personal?.pixTipo ?? "auto");
  const [nome, setNome] = useState(personal?.pixNome ?? personal?.nome ?? "");
  const [cidade, setCidade] = useState(personal?.pixCidade ?? "");
  const [documento, setDocumento] = useState(personal?.documento ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  const detectado = useMemo(() => {
    if (!chave.trim()) return null;
    return normalizarChavePix(chave, tipo === "auto" ? undefined : tipo);
  }, [chave, tipo]);

  // Prévia real: usa o mesmo gerador da cobrança, com R$ 1 de exemplo.
  const previa = useMemo(() => {
    if (!detectado?.ok) return null;
    const r = gerarPixCopiaECola({
      chave,
      tipoChave: tipo === "auto" ? undefined : tipo,
      nome: nome || personal?.nome || "",
      cidade,
      valor: 1,
      txid: "TESTE",
      descricao: "Mensalidade",
    });
    return r.ok ? r.codigo : null;
  }, [detectado, chave, tipo, nome, cidade, personal?.nome]);

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    setSalvo(false);
    const limpa = chave.trim();

    if (!limpa) {
      atualizarPerfil({
        pixChave: undefined,
        pixTipo: undefined,
        pixNome: undefined,
        pixCidade: undefined,
        documento: documento.trim() || undefined,
      });
      setErro(null);
      setSalvo(true);
      return;
    }

    const valida = normalizarChavePix(limpa, tipo === "auto" ? undefined : tipo);
    if (!valida.ok) return setErro(valida.erro);
    if (!cidade.trim()) return setErro("Informe a cidade — o banco exige no Pix.");

    atualizarPerfil({
      pixChave: limpa,
      pixTipo: valida.tipo,
      pixNome: (nome.trim() || personal?.nome || "").slice(0, 25),
      pixCidade: cidade.trim(),
      documento: documento.trim() || undefined,
    });
    setErro(null);
    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);
  };

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display flex items-center gap-2 text-xl font-semibold">
            <WalletIcon className="h-5 w-5 text-accent" />
            Recebimento por Pix
          </h2>
          <p className="mt-1 text-sm text-muted">
            O dinheiro cai direto na sua conta. O Voltage só monta o copia-e-cola da cobrança.
          </p>
        </div>
        {personal?.pixChave ? (
          <Badge tone="volt">Configurado</Badge>
        ) : (
          <Badge tone="off">Falta configurar</Badge>
        )}
      </div>

      <form onSubmit={salvar} className="mt-5 space-y-4">
        <Field
          label="Chave Pix"
          hint="CPF, CNPJ, celular, e-mail ou chave aleatória. Deixe em branco para desativar."
        >
          <Input
            value={chave}
            onChange={(e) => {
              setChave(e.target.value);
              setErro(null);
            }}
            placeholder="000.000.000-00"
            inputMode="text"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Tipo da chave" hint="Deixe no automático se estiver certo.">
            <Select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoChavePix | "auto")}
            >
              <option value="auto">
                Automático{detectado?.ok ? ` — ${rotuloTipoChave(detectado.tipo)}` : ""}
              </option>
              {TIPOS_CHAVE_PIX.map((t) => (
                <option key={t} value={t}>
                  {rotuloTipoChave(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Cidade" hint="Aparece no app do aluno.">
            <Input
              value={cidade}
              onChange={(e) => {
                setCidade(e.target.value);
                setErro(null);
              }}
              placeholder="Guarujá"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome de quem recebe" hint="Até 25 caracteres, como no banco.">
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={25}
              placeholder={personal?.nome ?? "Seu nome"}
            />
          </Field>
          <Field label="CPF/CNPJ no recibo" hint="Opcional — sai impresso no recibo.">
            <Input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder="000.000.000-00"
            />
          </Field>
        </div>

        {chave.trim() && detectado && !detectado.ok && (
          <p className="text-sm font-semibold text-danger">{detectado.erro}</p>
        )}
        {erro && <p className="text-sm font-semibold text-danger">{erro}</p>}

        {previa && (
          <div className="rounded-xl border border-line bg-surface-2/50 p-3">
            <p className="text-xs font-bold uppercase tracking-widest text-muted">
              Prévia do código (cobrança de R$ 1,00)
            </p>
            <p className="mt-1.5 break-all font-mono text-[11px] leading-relaxed text-muted">
              {previa}
            </p>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-1">
          {salvo && <span className="text-sm font-semibold text-accent">Salvo ✓</span>}
          <Button type="submit">Salvar Pix</Button>
        </div>
      </form>
    </Card>
  );
}
