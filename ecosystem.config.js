module.exports = {
  apps: [
    {
      // 1. Ứng dụng Web chính (Next.js)
      name: "seajong-erp",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    },
    {
      // 2. Bot Cào Dữ Liệu Thuế
      name: "tax-scraper-bot",
      script: "npx",
      args: "tsx scripts/tax-scraper.ts",
      // Chạy lúc 00:00, 08:00 và 16:00 mỗi ngày
      cron_restart: "0 0,8,16 * * *", 
      autorestart: false, // Ngăn chặn việc bot chạy liên tục sau khi kết thúc, chỉ chạy theo cron
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
