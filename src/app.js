// =====================================
// IMPORTAÇÕES
// =====================================
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const express = require("express"); // Adicionado Express

// =====================================
// CONFIGURAÇÃO DO CLIENTE
// =====================================
const client = new Client({
  authStrategy: new LocalAuth({ clientId: "default" }),
  puppeteer: {
    headless: false,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// =====================================
// QR CODE
// =====================================
client.on("qr", (qr) => {
  console.log("📲 Escaneie o QR Code abaixo:");
  qrcode.generate(qr, { small: true });
});

// =====================================
// WHATSAPP CONECTADO
// =====================================
client.on("ready", () => {
  console.log("✅ WhatsApp conectado com sucesso!");
});

// =====================================
// DESCONEXÃO
// =====================================
client.on("disconnected", (reason) => {
  console.log("⚠️ Desconectado:", reason);
});

// =====================================
// INICIALIZA
// =====================================
client.initialize();

// =====================================
// FUNÇÃO DE DELAY
// =====================================
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

// =====================================
// VARIÁVEIS DE CONTROLE
// =====================================
let atendimentoEncerrado = false;
let timeoutMap = new Map(); // Para controlar timers de inatividade por usuário

// =====================================
// FUNÇÃO PARA ENCERRAR ATENDIMENTO POR INATIVIDADE
// =====================================
const encerrarPorInatividade = async (chatId) => {
  await client.sendMessage(
    chatId,
    "⏳ Você ficou inativo por algum tempo. " +
      "Encerramos o atendimento por enquanto.\n\n" +
      "✅ Agradecemos seu contato! Quando quiser, é só nos enviar uma mensagem para reiniciar o atendimento."
  );
  atendimentoEncerrado = true;
  timeoutMap.delete(chatId);
};

// =====================================
// FUNIL DE MENSAGENS INTELIGENTE
// =====================================
client.on("message", async (msg) => {
  try {
    if (!msg.from || msg.from.endsWith("@g.us")) return; // ignora grupos
    const chat = await msg.getChat();
    if (chat.isGroup) return;

    const texto = msg.body ? msg.body.trim().toLowerCase() : "";

    const typing = async () => {
      await chat.sendStateTyping();
      await delay(1500);
    };

    // =====================================
    // REINICIA TIMER DE INATIVIDADE
    // =====================================
    if (timeoutMap.has(msg.from)) clearTimeout(timeoutMap.get(msg.from));
    timeoutMap.set(
      msg.from,
      setTimeout(() => encerrarPorInatividade(msg.from), 10 * 60 * 1000) // 10 minutos
    );

    // =====================================
    // OPÇÃO 0 - ENCERRAR ATENDIMENTO
    // =====================================
    if (texto === "0") {
      await typing();
      await client.sendMessage(
        msg.from,
        "✅ Atendimento encerrado. Agradecemos seu contato e esperamos vê-lo em breve! 👕"
      );
      atendimentoEncerrado = true;
      clearTimeout(timeoutMap.get(msg.from));
      timeoutMap.delete(msg.from);
      return;
    }

    // =====================================
    // REINÍCIO DO FLUXO APÓS ENCERRAMENTO
    // =====================================
    if (atendimentoEncerrado) {
      atendimentoEncerrado = false;
    }

    // =====================================
    // MENSAGEM INICIAL OU MENU
    // =====================================
    if (
      texto.includes("menu") ||
      texto.includes("oi") ||
      texto.includes("olá") ||
      texto.includes("ola") ||
      texto.includes("bom dia") ||
      texto.includes("boa tarde") ||
      texto.includes("boa noite")
    ) {
      await typing();
      await client.sendMessage(
        msg.from,
        "👕 Linha Reta! É um prazer ter você como cliente.\n\n" +
          "Aqui na nossa loja, cada atendimento é feito com atenção e rapidez.\n\n" +
          "Escolha a opção que melhor atende você:\n" +
          "1️⃣ Fazer pedido\n" +
          "2️⃣ Informações sobre envio\n" +
          "3️⃣ Falar diretamente com nossa equipe\n" +
          "0️⃣ Encerrar atendimento"
      );
      return;
    }

    // =====================================
    // OPÇÃO 1 - FAZER PEDIDO
    // =====================================
    if (texto === "1") {
      await typing();
      await client.sendMessage(
        msg.from,
        "🛒 Perfeito! Fazer seu pedido é rápido e fácil:\n" +
          "- Pelo WhatsApp: envie a lista dos produtos que deseja\n" +
          "- Pelo site: www.sualoja.com.br\n" +
          "- Pelo Instagram: @sualoja\n\n" +
          "Ou nos diga qual produto você deseja adquirir, e nosso time irá te ajudar rapidinho.\n" +
          "Digite 'menu' a qualquer momento para voltar ao início."
      );
      return;
    }

    // =====================================
    // OPÇÃO 2 - ENVIO
    // =====================================
    if (texto === "2") {
      await typing();
      await client.sendMessage(
        msg.from,
        "🚚 Sobre envio e entrega:\n" +
          "- Fazemos entregas para todo o Brasil (frete por conta do cliente)\n" +
          "- Para a região da loja, podemos combinar entregas diretamente com o cliente\n" +
          "Digite 'menu' para voltar ao início."
      );
      return;
    }

    // =====================================
    // OPÇÃO 3 - CONTATO DIRETO
    // =====================================
    if (texto === "3") {
      await typing();
      await client.sendMessage(
        msg.from,
        "📞 Ótimo! Você escolheu falar com nossa equipe.\n" +
          "Nos conte sua dúvida, nosso time vai te responder com atenção e rapidez.\n" +
          "Digite 'menu' para voltar ao início quando quiser."
      );
      return;
    }

    // =====================================
    // OPÇÃO INVÁLIDA
    // =====================================
    await typing();
    await client.sendMessage(
      msg.from,
          "❌ Ops! Não reconhecemos essa opção. Digite um número de 0 a 3 ou 'menu' para voltar."
    );
  } catch (error) {
    console.error("❌ Erro no processamento da mensagem:", error);
  }
});

// =====================================
// EXPRESS SERVER PARA UPTIMEROBOT
// =====================================
const app = express();

app.get("/", (req, res) => {
  res.send("Bot WhatsApp ativo ✅");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));