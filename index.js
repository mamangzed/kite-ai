import axios from 'axios';
import fs from 'fs';
import figlet from 'figlet';
import chalk from 'chalk';
import boxen from 'boxen';
import { Twisters } from 'twisters';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

marked.setOptions({
  renderer: new TerminalRenderer()
});


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const spinner = new Twisters(); 

const agents = {
  "deployment_p5J9lz1Zxe7CYEoo0TZpRVay": "Professor 🧠",
  "deployment_7sZJSiCqCNDy9bBHTEh7dwd9": "Crypto Buddy 💰",
  "deployment_SoFftlsf9z4fyA3QCHYkaANq": "Sherlock 🔎"
};

async function countdown(seconds, id) {
  return new Promise((resolve) => {
    let remaining = seconds;

    const interval = setInterval(() => {
      const hours = Math.floor(remaining / 3600);
      const minutes = Math.floor((remaining % 3600) / 60);
      const secs = remaining % 60;

      const formattedTime = 
        `${hours.toString().padStart(2, '0')}:` +
        `${minutes.toString().padStart(2, '0')}:` +
        `${secs.toString().padStart(2, '0')}`;

      spinner.put(id, { 
        text: `⏳ Menunggu ${formattedTime} sebelum melanjutkan...`
      });

      remaining--;

      if (remaining < 0) {
        clearInterval(interval);
        spinner.put(id, { text: '⏩ Mengirim ulang permintaan...' });
        resolve();
      }
    }, 1000);
  });
}


async function delay24Hours(statusId) {
  const hours = 24;
  const totalSeconds = hours * 60 * 60;
  spinner.put(statusId, { text: `⏰ Menunggu ${hours} jam sebelum memulai sesi baru...` });
  await countdown(totalSeconds, statusId);
}

function displayAppTitle() {
  console.log('\n' + boxen(
    chalk.cyan(figlet.textSync(' Kite AI ', { horizontalLayout: 'full' })) +
    '\n' + chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━') +
    '\n' + chalk.gray('By Mamangzed') +
    '\n' + chalk.dim('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'double',
      borderColor: 'cyan',
      float: 'center'
    }
  ));
}

async function stats(wallet,statsId) {
  try{
    const res = await axios.get(`https://quests-usage-dev.prod.zettablock.com/api/user/${wallet.toLowerCase()}/stats`);
    spinner.put(statsId, { text: `📈 Total interaksi ${res.data.total_interactions}` });
    return res.data;
  }catch(error){
    spinner.put(statsId,chalk.red('❌ Gagal memuat statistik'));
    return null;
  }
}

async function sendRandomQuestion(agent, statusId) {
  try {
    const randomQuestions = JSON.parse(fs.readFileSync('random_questions.json', 'utf-8'));
    const randomQuestion = randomQuestions[Math.floor(Math.random() * randomQuestions.length)];

    spinner.put(statusId, { text: '📤 Mengirim pertanyaan...' });

    const payload = { message: randomQuestion, stream: false };
    const response = await axios.post(`https://${agent.toLowerCase().replace('_','-')}.stag-vxzy.zettablock.com/main`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    spinner.put(statusId, { text: '✅ Pertanyaan berhasil dikirim' });
    return { question: randomQuestion, response: response.data.choices[0].message };
  } catch (error) {
    spinner.put(statusId, { text: '❌ Gagal mengirim pertanyaan' });
    return null;
  }
}

async function reportUsage(wallet, options, statusId) {
  try {
    spinner.put(statusId, { text: '📊 Melaporkan penggunaan...' });
    
    const payload = {
      wallet_address: wallet,
      agent_id: options.agent_id,
      request_text: options.question,
      response_text: options.response,
      request_metadata: {}
    };

    await axios.post(`https://quests-usage-dev.prod.zettablock.com/api/report_usage`, payload, {
      headers: { 'Content-Type': 'application/json' }
    });

    spinner.put(statusId, { text: '✅ Data penggunaan berhasil dilaporkan' });
  } catch (error) {
    spinner.put(statusId, { text: '❌ Gagal melaporkan penggunaan' });
    spinner.put(statusId, { text: '🔄 Mencoba kembali dalam 60 detik...' });
    await countdown(62, statusId);
  }
}

function createBox(content, title, color = 'cyan') {
  return boxen(
    chalk[color](content),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: color,
      title: chalk.bold[color](title),
      titleAlignment: 'center'
    }
  );
}

async function processWallet(wallet, iterations) {
 
  const walletId = `wallet_${wallet}`;
  const statusId = `status_${wallet}`;
  const agnetId = `agent_${wallet}`;
  const progressId = `progress_${wallet}`;

  const statsId = `stats_${wallet}`;
  const delimeId = `delime_${wallet}`;
  spinner.put(delimeId, { text: chalk.dim('─'.repeat(process.stdout.columns - 3 || 80)) });

  spinner.put(walletId, { text: `🔑 Wallet: ${wallet.slice(0, 6)}...${wallet.slice(-4)}` });
  spinner.put(agnetId, { text: '⌛ Memulai sesi...' });
  spinner.put(statusId, { text: '⌛ Memulai sesi...' });
  spinner.put(progressId, { text: '📊 Progress: 0/0' });
  spinner.put(statsId, { text: '📈 Memuat statistik...' });
  const totalQuestions = iterations * Object.keys(agents).length;
  let completedQuestions = 0;

  while (true) {
    for (const [agentId, agentName] of Object.entries(agents)) {
      spinner.put(agnetId, { text: `🤖 Agent Aktif: ${agentName}` });

      for (let i = 0; i < iterations; i++) {
        const nanya = await sendRandomQuestion(agentId, statusId);
        if (nanya !== false) {
          await reportUsage(wallet.toLowerCase(), {
            agent_id: agentId,
            question: nanya.question,
            response: nanya?.response?.content ?? 'Tidak ada jawaban'
          }, statusId);
          const progress = await stats(wallet,statsId);
          completedQuestions++;
        }
        spinner.put(progressId, { 
          text: `📊 Progress: ${completedQuestions}/${totalQuestions} | Iterasi: ${i + 1}/${iterations}` 
        });
      }
    }
    spinner.put(statusId, { text: '🎉 Sesi selesai! Menunggu 24 jam...' });
    completedQuestions = 0;
    await delay24Hours(statusId);
  }
}

async function readWallets() {
  try {
    const data = fs.readFileSync('wallets.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error(chalk.red('Error membaca file wallets.json:'), error.message);
    process.exit(1);
  }
}

async function main() {
  console.clear();
  displayAppTitle();

  const wallets = await readWallets();
  if (!wallets.length) {
    console.error(chalk.red('❌ Tidak ada wallet yang ditemukan di wallets.json'));
    process.exit(1);
  }

  console.log(boxen(
    `${chalk.blue('📌 Konfigurasi Sesi')}\n` +
    `${chalk.yellow('🔑 Jumlah Wallet:')} ${wallets.length}`,
    { padding: 1, borderStyle: 'round', borderColor: 'yellow' }
  ));

  const walletPromises = wallets.map(wallet => {
    
    return processWallet(wallet.address, wallet.iterations); 
});

  try {
    await Promise.all(walletPromises);
  } catch (error) {
    console.error(chalk.red('Error dalam menjalankan sesi:'), error);
  }
}

process.on('SIGINT', () => {
  spinner.stop();
  process.exit();
});

process.on('uncaughtException', (error) => {
  console.error(chalk.red('Uncaught Exception:'), error);
  spinner.stop();
  process.exit(1);
});

main().catch(error => {
  console.error(chalk.red('Error:'), error);
  process.exit(1);
});
