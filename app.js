// 模拟数据，真实场景可通过 API 调用动态获取数据
const demoCharacterData = {
    "休": {
      explanation: "“休”由“人”和“木”组合而成，意为人在树旁休息。",
      components: ["人", "木"],
      related: ["析", "林", "体"]
    },
    // 可扩展更多汉字信息
  };
  
  const demoRecommendations = ["人", "目", "手", "口", "心"];
  
  document.getElementById("searchForm").addEventListener("submit", function(e) {
    e.preventDefault();
    const character = document.getElementById("characterInput").value.trim();
    const resultDiv = document.getElementById("result");
    
    if (character === "") {
      resultDiv.innerHTML = "<p>请输入一个汉字进行查询。</p>";
      return;
    }
  
    // 此处应调用后端 API 或 AI 模型获取数据
    if (demoCharacterData[character]) {
      const data = demoCharacterData[character];
      resultDiv.innerHTML = `
        <h3>${character}</h3>
        <p>${data.explanation}</p>
        <p><strong>部件：</strong>${data.components.join("、")}</p>
        <p><strong>相关汉字：</strong>${data.related.join("、")}</p>
      `;
    } else {
      resultDiv.innerHTML = `<p>暂未收录汉字“${character}”的详细信息。</p>`;
    }
  });
  
  document.getElementById("loadRecommendation").addEventListener("click", function() {
    const list = document.getElementById("recommendList");
    list.innerHTML = "";
    // 模拟动态推荐逻辑，根据 AI 模型和学生画像推荐汉字
    demoRecommendations.forEach(char => {
      const li = document.createElement("li");
      li.textContent = char;
      list.appendChild(li);
    });
  });