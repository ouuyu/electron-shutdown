document.addEventListener("DOMContentLoaded", () => {
  let poetryInterval;
  let currentIndex = 0;

  function loadRandomPoetry() {
    fetch("../cdn/sentences.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP 错误! 状态: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const poetryLine = document.getElementById("poetryLine");

        if (!Array.isArray(data) || data.length === 0) {
          console.error("诗词数据加载失败：文件为空或格式不正确。");
          if (poetryLine) poetryLine.textContent = "诗词数据加载失败";
          if (poetryInterval) clearInterval(poetryInterval);
          return;
        }

        if (poetryLine) {
          // 淡出动画
          poetryLine.classList.remove('fade-in');
          poetryLine.classList.add('fade-out');

          const exitAnimationDuration = 1000;

          setTimeout(() => {
            const entry = data[Math.floor(Math.random() * data.length)];
            if (!entry || !entry.content || !Array.isArray(entry.content) || entry.content.length === 0) {
              console.error("当前诗词条目无效或内容为空，将尝试重新加载。", entry);
              loadRandomPoetry();
              return;
            }

            const randomLine = entry.content[Math.floor(Math.random() * entry.content.length)];

            if (typeof randomLine !== 'string' || randomLine.trim() === '') {
              console.error("当前诗句无效或为空，将尝试重新加载。");
              loadRandomPoetry();
              return;
            }

            // 直接显示诗句，不分行
            poetryLine.textContent = randomLine;

            // 淡入动画
            poetryLine.classList.remove('fade-out');
            poetryLine.classList.add('fade-in');

            // 计算下次切换时间
            const baseTime = 6000;
            const timePerChar = 200;
            const newInterval = baseTime + randomLine.length * timePerChar;

            clearInterval(poetryInterval);
            poetryInterval = setInterval(loadRandomPoetry, newInterval);
          }, exitAnimationDuration);
        }
      })
      .catch((err) => {
        console.error("加载诗词文件失败：", err);
        const poetryLine = document.getElementById("poetryLine");
        if (poetryLine) {
          poetryLine.textContent = "诗词加载失败";
        }
        if (poetryInterval) clearInterval(poetryInterval);
      });
  }

  loadRandomPoetry();
  poetryInterval = setInterval(loadRandomPoetry, 8000);
});