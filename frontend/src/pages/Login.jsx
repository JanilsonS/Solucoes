import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api, { LOGO_URL } from "@/lib/api";

export default function Login() {
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ email: "", password: "", nome: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const { data } = await api.post(path, form);
      localStorage.setItem("mm_token", data.token);
      localStorage.setItem("mm_user", JSON.stringify(data.user));
      toast.success(`Bem-vinda, ${data.user.nome}!`);
      nav("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mm-bg-pattern flex items-center justify-center p-4 mm-watermark">
      <div className="w-full max-w-md mm-glass p-8">
        <div className="flex flex-col items-center mb-6">
          <img src={LOGO_URL} alt="MM Confeitaria" className="h-32 w-32 object-contain mb-3" />
          <h1 className="font-display text-3xl text-[#3D2817] tracking-wide text-center">
            MM Confeitaria & Eventos
          </h1>
          <p className="text-sm text-[#8B5E48] mt-1 italic">Sistema de Gestão & Precificação</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="mm-label">Nome</label>
              <input
                data-testid="register-name-input"
                className="mm-input"
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                required
              />
            </div>
          )}
          <div>
            <label className="mm-label">Email</label>
            <input
              data-testid="login-email-input"
              type="email"
              className="mm-input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="mm-label">Senha</label>
            <input
              data-testid="login-password-input"
              type="password"
              className="mm-input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </div>
          <button
            data-testid="login-submit-btn"
            type="submit"
            disabled={loading}
            className="mm-btn-3d w-full mt-2"
          >
            {loading ? "Entrando..." : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
          <button
            data-testid="toggle-mode-btn"
            type="button"
            onClick={() => setMode(mode === "login" ? "register" : "login")}
            className="text-sm text-[#8B5E48] hover:underline w-full text-center"
          >
            {mode === "login" ? "Criar conta nova" : "Já tenho conta"}
          </button>
        </form>
      </div>
    </div>
  );
}
