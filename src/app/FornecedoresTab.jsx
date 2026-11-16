
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Store,
  ShoppingBag,
  Plus,
  Search,
  Trash2,
  Pencil,
  ExternalLink,
  Ruler,
  CheckCircle2,
  X,
} from "lucide-react";
import { supabase } from "../lib/db.js";

const EMPTY_FORM = {
  produto_id: "",
  plataforma: "Shopee",
  nome: "",
  variacao: "",
  url: "",
};

function recomendarTamanho(sexo, peso, altura, biotipo) {
  const kg = Number(peso);
  const cm = Number(altura);

  if (!kg || !cm || kg <= 0 || cm <= 0) return null;

  if (cm > 177) {
    return {
      tamanho: "Fora da tabela",
      explicacao: "A tabela de referência vai até 1,77 m. Confirme o tamanho com o fornecedor.",
    };
  }

  if (sexo === "feminino") {
    if (kg <= 60 && cm <= 165) {
      return {
        tamanho: "G feminino",
        explicacao: "Indicado para mulheres de até 60 kg e até 1,65 m.",
      };
    }

    if (kg <= 67 && cm <= 167) {
      return {
        tamanho: "2XG feminino",
        explicacao: "Indicado para mulheres de até 67 kg e até 1,67 m.",
      };
    }

    if (kg >= 70 && kg < 80) {
      return {
        tamanho: "M masculino",
        explicacao: "A tabela recomenda o M masculino para mulheres acima de 70 kg, respeitando a altura máxima de 1,77 m.",
      };
    }

    if (kg >= 80) {
      if (biotipo === "baixa") {
        return {
          tamanho: "2XG masculino",
          explicacao: "Recomendado para mulheres de 80 kg ou mais, com estatura mais baixa e corpo mais encorpado.",
        };
      }

      if (biotipo === "alta") {
        return {
          tamanho: "G masculino",
          explicacao: "Recomendado para mulheres de 80 kg ou mais, com estatura mais alta.",
        };
      }

      return {
        tamanho: "Escolha o biotipo",
        explicacao: "Para mulheres acima de 80 kg, a tabela recomenda 2XG masculino para corpo mais baixo e encorpado, ou G masculino para corpo mais alto.",
      };
    }
  }

  if (sexo === "masculino") {
    if (kg <= 75) {
      return {
        tamanho: "M masculino",
        explicacao: "Indicado para homens de até aproximadamente 70/75 kg e até 1,77 m.",
      };
    }

    if (kg <= 80) {
      return {
        tamanho: "G masculino",
        explicacao: "Indicado para homens de até 80 kg e até 1,77 m.",
      };
    }

    if (kg >= 85 && kg <= 108) {
      return {
        tamanho: "2XG masculino",
        explicacao: "Indicado para homens de 85 kg até 108 kg e até 1,77 m.",
      };
    }

    if (kg >= 110) {
      return {
        tamanho: "4XG masculino",
        explicacao: "Indicado para homens a partir de 110 kg e até 1,77 m.",
      };
    }
  }

  return {
    tamanho: "Confirmar com fornecedor",
    explicacao: "O peso ou a altura está em uma faixa não especificada na tabela. Confirme antes de enviar o pedido.",
  };
}

export default function FornecedoresTab({ products = [], empresaId }) {
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("Todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [sexo, setSexo] = useState("masculino");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [biotipo, setBiotipo] = useState("");

  const regatas = useMemo(
    () => products.filter((p) => /regata|sauna/i.test(p.nome || "") && p.ativo),
    [products]
  );

  const resultado = recomendarTamanho(sexo, peso, altura, biotipo);

  async function carregar() {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setFornecedores(data || []);
    } catch (e) {
      setError(e.message || "Não foi possível carregar os fornecedores.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
  }, [empresaId]);

  function abrirNovo() {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
      produto_id: products.find((p) => p.ativo)?.id || "",
    });
    setError("");
    setFormOpen(true);
  }

  function abrirEdicao(item) {
    setEditingId(item.id);
    setForm({
      produto_id: item.produto_id || "",
      plataforma: item.plataforma || "Shopee",
      nome: item.nome || "",
      variacao: item.variacao || "",
      url: item.url || "",
    });
    setError("");
    setFormOpen(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setError("");

    if (!form.produto_id || !form.nome.trim() || !form.url.trim()) {
      setError("Selecione o produto e preencha o nome e o link.");
      return;
    }

    let link;

    try {
      link = new URL(form.url.trim());

      if (!["http:", "https:"].includes(link.protocol)) {
        throw new Error("Informe um link válido.");
      }
    } catch {
      setError("O link informado não é válido.");
      return;
    }

    setSaving(true);

    try {
      const dados = {
        produto_id: form.produto_id,
        plataforma: form.plataforma,
        nome: form.nome.trim(),
        variacao: form.variacao.trim() || null,
        url: link.href,
      };

      const resposta = editingId
        ? await supabase
            .from("fornecedores")
            .update(dados)
            .eq("id", editingId)
            .eq("empresa_id", empresaId)
        : await supabase
            .from("fornecedores")
            .insert({
              ...dados,
              empresa_id: empresaId,
            });

      if (resposta.error) throw resposta.error;

      setFormOpen(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await carregar();
    } catch (e) {
      setError(e.message || "Não foi possível salvar o fornecedor.");
    } finally {
      setSaving(false);
    }
  }

  async function excluir(id) {
    if (!window.confirm("Deseja excluir este link de fornecedor?")) return;

    const { error } = await supabase
      .from("fornecedores")
      .delete()
      .eq("id", id)
      .eq("empresa_id", empresaId);

    if (error) {
      setError(error.message);
      return;
    }

    await carregar();
  }

  const listaFiltrada = fornecedores.filter((item) => {
    const produto = products.find((p) => p.id === item.produto_id);
    const texto = [
      item.nome,
      item.variacao,
      produto?.nome,
    ].join(" ").toLowerCase();

    return (
      (filtro === "Todos" || item.plataforma === filtro) &&
      texto.includes(busca.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">

      {/* CABEÇALHO */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="page-eyebrow">Compras e parceiros</p>
          <h2 className="text-2xl font-extrabold mt-1">Fornecedores</h2>
          <p className="text-sm text-slate-500 mt-1">
            Organize os fornecedores e os links de cada produto.
          </p>
        </div>

        <button onClick={abrirNovo} className="primary-button">
          <Plus size={16} />
          Novo fornecedor
        </button>
      </div>

      {/* PLATAFORMAS */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setFiltro("Shopee")}
          className="admin-card p-4 text-left"
          style={{
            borderColor: filtro === "Shopee" ? "#4F6BFF" : undefined,
          }}
        >
          <ShoppingBag size={24} color="#EE4D2D" />
          <p className="font-bold mt-2">Shopee</p>
          <p className="text-xs text-slate-500">
            {fornecedores.filter((f) => f.plataforma === "Shopee").length} links cadastrados
          </p>
        </button>

        <button
          onClick={() => setFiltro("Mercado Livre")}
          className="admin-card p-4 text-left"
          style={{
            borderColor: filtro === "Mercado Livre" ? "#4F6BFF" : undefined,
          }}
        >
          <Store size={24} color="#D6A400" />
          <p className="font-bold mt-2">Mercado Livre</p>
          <p className="text-xs text-slate-500">
            {fornecedores.filter((f) => f.plataforma === "Mercado Livre").length} links cadastrados
          </p>
        </button>
      </div>

      {/* CALCULADORA DE TAMANHOS */}
      {regatas.length > 0 && (
        <section className="admin-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Ruler size={22} color="#4F6BFF" />
            <div>
              <h3 className="font-extrabold">Calculadora de tamanho</h3>
              <p className="text-xs text-slate-500">
                Regata Efeito Sauna
              </p>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-2">
              Sexo do cliente
            </label>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSexo("masculino")}
                className="rounded-xl px-4 py-2 text-xs font-bold"
                style={{
                  background: sexo === "masculino" ? "#4F6BFF" : "#F0F2F7",
                  color: sexo === "masculino" ? "#fff" : "#526079",
                }}
              >
                Masculino
              </button>

              <button
                type="button"
                onClick={() => setSexo("feminino")}
                className="rounded-xl px-4 py-2 text-xs font-bold"
                style={{
                  background: sexo === "feminino" ? "#4F6BFF" : "#F0F2F7",
                  color: sexo === "feminino" ? "#fff" : "#526079",
                }}
              >
                Feminino
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">
                Peso (kg)
              </label>
              <input
                type="number"
                min="1"
                step="0.1"
                className="w-full rounded-xl p-3 text-sm border"
                placeholder="Ex.: 78"
                value={peso}
                onChange={(e) => setPeso(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">
                Altura (cm)
              </label>
              <input
                type="number"
                min="1"
                className="w-full rounded-xl p-3 text-sm border"
                placeholder="Ex.: 175"
                value={altura}
                onChange={(e) => setAltura(e.target.value)}
              />
            </div>
          </div>

          {sexo === "feminino" && Number(peso) >= 80 && (
            <div>
              <label className="text-xs font-semibold block mb-1">
                Biotipo
              </label>
              <select
                className="w-full rounded-xl p-3 text-sm border"
                value={biotipo}
                onChange={(e) => setBiotipo(e.target.value)}
              >
                <option value="">Selecione o biotipo</option>
                <option value="baixa">Mais baixa e encorpada</option>
                <option value="alta">Mais alta</option>
              </select>
            </div>
          )}

          {resultado && (
            <div className="rounded-xl p-4" style={{ background: "#EEF1FF" }}>
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 size={18} color="#4F6BFF" />
                <p className="text-xs font-bold text-slate-600">
                  TAMANHO RECOMENDADO
                </p>
              </div>

              <p className="text-2xl font-extrabold text-blue-700">
                {resultado.tamanho}
              </p>

              <p className="text-sm mt-2 text-slate-700">
                {resultado.explicacao}
              </p>

              <p className="text-[10px] mt-3 text-slate-500">
                Recomendação baseada na tabela de referência. Confirme os casos fora das faixas com o fornecedor.
              </p>
            </div>
          )}
        </section>
      )}

      {/* BUSCA E FILTROS */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="w-full rounded-xl pl-9 pr-3 py-3 text-sm border"
            placeholder="Buscar fornecedor ou produto..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        <button
          onClick={() => setFiltro("Todos")}
          className="secondary-button"
        >
          Todos
        </button>
      </div>

      {/* FORMULÁRIO */}
      {formOpen && (
        <form
          onSubmit={salvar}
          className="admin-card p-4 sm:p-5 space-y-3"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold">
              {editingId ? "Editar fornecedor" : "Cadastrar fornecedor"}
            </h3>

            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="p-2 rounded-lg"
            >
              <X size={18} />
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              Produto cadastrado
            </label>
            <select
              className="w-full rounded-xl p-3 text-sm border"
              value={form.produto_id}
              onChange={(e) =>
                setForm({ ...form, produto_id: e.target.value })
              }
            >
              <option value="">Selecione um produto</option>
              {products.filter((p) => p.ativo).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              Plataforma
            </label>
            <select
              className="w-full rounded-xl p-3 text-sm border"
              value={form.plataforma}
              onChange={(e) =>
                setForm({ ...form, plataforma: e.target.value })
              }
            >
              <option value="Shopee">Shopee</option>
              <option value="Mercado Livre">Mercado Livre</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              Nome do anúncio / fornecedor
            </label>
            <input
              className="w-full rounded-xl p-3 text-sm border"
              placeholder="Ex.: Regata Sauna - fornecedor Pernambuco"
              value={form.nome}
              onChange={(e) =>
                setForm({ ...form, nome: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              Variação
            </label>
            <input
              className="w-full rounded-xl p-3 text-sm border"
              placeholder="Ex.: Até 4XG ou kit com 4 unidades"
              value={form.variacao}
              onChange={(e) =>
                setForm({ ...form, variacao: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">
              Link do produto
            </label>
            <input
              type="url"
              className="w-full rounded-xl p-3 text-sm border"
              placeholder="https://..."
              value={form.url}
              onChange={(e) =>
                setForm({ ...form, url: e.target.value })
              }
            />
          </div>

          {error && (
            <p className="text-xs font-semibold text-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="secondary-button flex-1"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="primary-button flex-1"
            >
              {saving ? "Salvando..." : "Salvar fornecedor"}
            </button>
          </div>
        </form>
      )}

      {/* ERROS */}
      {error && !formOpen && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {/* LISTA DE FORNECEDORES */}
      {loading ? (
        <p className="text-sm text-slate-500 py-8 text-center">
          Carregando fornecedores...
        </p>
      ) : listaFiltrada.length === 0 ? (
        <div className="admin-card text-center py-12 px-5">
          <Store size={30} className="mx-auto mb-3 text-slate-400" />

          <p className="font-bold text-sm">
            Nenhum fornecedor encontrado
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Cadastre um link da Shopee ou do Mercado Livre.
          </p>

          <button
            onClick={abrirNovo}
            className="primary-button mt-4"
          >
            <Plus size={15} />
            Adicionar primeiro link
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {listaFiltrada.map((item) => {
            const produto = products.find(
              (p) => p.id === item.produto_id
            );

            return (
              <article key={item.id} className="admin-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase text-blue-600">
                      {item.plataforma}
                    </span>

                    <h3 className="font-extrabold text-sm mt-1">
                      {item.nome}
                    </h3>

                    <p className="text-xs text-slate-500 mt-1">
                      Produto: {produto?.nome || "Produto não encontrado"}
                    </p>

                    {item.variacao && (
                      <p className="text-xs text-slate-500 mt-1">
                        Variação: {item.variacao}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg"
                      style={{ background: "#EEF1FF", color: "#4F6BFF" }}
                      title="Abrir link"
                    >
                      <ExternalLink size={16} />
                    </a>

                    <button
                      onClick={() => abrirEdicao(item)}
                      className="p-2 rounded-lg"
                      style={{ background: "#F0F2F7", color: "#526079" }}
                      title="Editar"
                    >
                      <Pencil size={16} />
                    </button>

                    <button
                      onClick={() => excluir(item.id)}
                      className="p-2 rounded-lg"
                      style={{ background: "#FFF0F3", color: "#D94D67" }}
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
