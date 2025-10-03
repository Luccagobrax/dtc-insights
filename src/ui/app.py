# src/ui/app.py
import os
from dotenv import load_dotenv
load_dotenv()  # garante que .env seja lido

import streamlit as st

# Usa o seu agente (que já sabe chamar as tools do BigQuery)
from src.agent.agent import get_agent

st.set_page_config(page_title="dtc-insights · Assistente DTC", layout="wide")

st.title("🛠️ dtc-insights · Assistente DTC")
st.caption("Converse em PT-BR sobre DTCs, FMI, severidade e próximos passos. Se quiser, informe placa/IMEI ao lado para ele buscar dados reais.")

# --- Sidebar (opcional) ----------------------------------------------------
with st.sidebar:
    st.subheader("⚙️ Contexto opcional")
    vehicle_key = st.text_input("Placa ou IMEI (opcional)", placeholder="ex.: RYO1H50 ou 3556...")
    hours = st.slider("Janela DTC (horas)", 6, 240, 24, step=6)
    minutes = st.slider("Janela Telemetria (min)", 10, 240, 60, step=5)
    if st.button("🧹 Limpar conversa"):
        st.session_state.messages = []

# --- Agente singleton ------------------------------------------------------
if "agent" not in st.session_state:
    try:
        st.session_state.agent = get_agent()
    except Exception as e:
        st.error(f"Falha criando o agente: {e}")
        st.stop()

agent = st.session_state.agent

# --- Estado de mensagens ---------------------------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []

# Render histórico
for m in st.session_state.messages:
    with st.chat_message(m["role"]):
        st.markdown(m["content"])

# Campo de chat
user_msg = st.chat_input("Digite sua pergunta… (ex.: 'Resuma os DTCs críticos das últimas 24h')")
if user_msg:
    # Mostra a mensagem do usuário
    st.session_state.messages.append({"role": "user", "content": user_msg})
    with st.chat_message("user"):
        st.markdown(user_msg)

    # Monta o prompt (se tiver vehicle_key, dá a dica das ferramentas)
    prompt = user_msg
    if vehicle_key:
        prompt += (
            f"\n\nSe útil, use as ferramentas:\n"
            f"- fetch_dtcs(vehicle_key='{vehicle_key}', hours={hours})\n"
            f"- fetch_telemetry(vehicle_key='{vehicle_key}', minutes={minutes})"
        )

    # Chama o agente
    with st.chat_message("assistant"):
        try:
            result = agent.run(prompt)
            text = getattr(result, "content", None) or getattr(result, "text", None) or str(result)
            st.markdown(text)
            st.session_state.messages.append({"role": "assistant", "content": text})
        except Exception as e:
            st.error(f"Erro ao responder: {e}")
