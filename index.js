const axios = require('axios');

// ====== 配置区（替换为你的 Webhook）======
const CONFIG = {
  UP_UID: '322005137',
  FEISHU_WEBHOOK: 'https://open.feishu.cn/open-apis/bot/v2/hook/bb69ef67-a1e8-46fd-98e2-1ffb82d9bc66', // ← 替换为你的完整 URL
};
// =========================================

let lastDynamicId = null;

async function sendFeishu(title, text, link) {
  try {
    await axios.post(CONFIG.FEISHU_WEBHOOK, {
      msg_type: "post",
      content: {
        post: {
          zh_cn: {
            title: title,
            content: [
              [{ tag: "text", text: text }],
              [{ tag: "a", text: "👉 查看动态", href: link }]
            ]
          }
        }
      }
    });
    console.log("✅ 飞书消息发送成功");
  } catch (err) {
    console.error("❌ 飞书推送失败:", err.message);
  }
}

async function fetchLatestDynamic() {
  const url = `https://api.bilibili.com/x/polymer/web-dynamic/v1/feed/space?host_mid=${CONFIG.UP_UID}`;
  
  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36',
        'Referer': `https://space.bilibili.com/${CONFIG.UP_UID}`
      },
      timeout: 10000
    });

    if (res.data.code !== 0) {
      throw new Error(`B站 API 错误: ${res.data.message}`);
    }

    const items = res.data.data?.items;
    if (!items || items.length === 0) {
      console.log("📭 无动态数据");
      return;
    }

    const latest = items[0];
    const dynamicId = latest.id_str;
    const author = latest.modules.module_author.name;

    let content = "发布了新动态";
    try {
      if (latest.modules.module_dynamic.major?.archive) {
        content = latest.modules.module_dynamic.major.archive.title;
      } else if (latest.modules.module_dynamic.major?.opus) {
        content = latest.modules.module_dynamic.major.opus.summary.text;
      } else if (latest.modules.module_dynamic.desc?.text) {
        content = latest.modules.module_dynamic.desc.text;
      }
    } catch (e) {
      console.warn("内容提取失败，使用默认文案");
    }

    if (lastDynamicId === dynamicId) {
      console.log("🔄 动态未更新，跳过");
      return;
    }

    lastDynamicId = dynamicId;
    const link = `https://t.bilibili.com/${dynamicId}`;

    console.log(`🔔 发现新动态: ${author} - ${content}`);
    await sendFeishu("【B站】UP 主更新啦！", `${author}：${content}`, link);

  } catch (err) {
    console.error("💥 获取 B站 动态失败:", err.message);
  }
}

exports.handler = async (event, context, callback) => {
  console.log("⏰ 开始检查 B站 动态...");
  await fetchLatestDynamic();
  callback(null, 'OK');
};
