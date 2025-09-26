import streamlit as st
from agno import Agent
from src.agent.agent import assistant

st.set_page_config(page_title="dtc-insights :: Chat")
st.title("dtc-insights — DAF Incident Chat")

if "history" not in st.session_state:
    st.session_state.history = []

msg = st.chat_input("Pergunte por placa/VIN/veículo...")
if msg:
    st.session_state.history.append(("user", msg))
    resp = assistant.run(msg)
    st.session_state.history.append(("assistant", str(resp)))

for role, m in st.session_state.history:
    with st.chat_message(role):
        st.write(m)
