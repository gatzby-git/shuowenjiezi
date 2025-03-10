// 汉字学习应用主逻辑
import CharacterDataService from './data-service.js';
import UserProfileManager from './user-profile.js';

class HanziLearningApp {
  constructor() {
    this.dataService = CharacterDataService;
    this.userProfile = null;
    this.currentCharacter = null;
    
    // 用于跟踪中文输入法的组合状态
    this.isComposing = false;
    
    // 初始化应用
    this.init();
  }
  
  // 初始化应用
  async init() {
    // 注册事件监听器
    this.registerEventListeners();
    
    // 加载用户画像
    await this.loadUserProfile();
    
    // 初始化界面
    this.updateUIControls();
    
    console.log("《说文解字》AI辅助学习工具初始化完成");
  }
  
  // 注册事件监听器
  registerEventListeners() {
    const searchInput = document.getElementById("characterInput");
    const searchForm = document.getElementById("searchForm");
    
    // 处理中文输入法的组合事件
    searchInput.addEventListener("compositionstart", () => {
      this.isComposing = true;
    });
    searchInput.addEventListener("compositionend", () => {
      this.isComposing = false;
    });
    
    // 汉字搜索表单提交
    searchForm.addEventListener("submit", (e) => {
      e.preventDefault();
      // 避免在输入法组合过程中提交表单
      if (this.isComposing) return;
      const character = searchInput.value.trim();
      this.searchCharacter(character);
    });
    
    // 推荐汉字按钮
    document.getElementById("loadRecommendation").addEventListener("click", () => {
      this.loadRecommendations();
    });
    
    // 用户设置保存按钮
    const saveSettingsBtn = document.getElementById("saveUserSettings");
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener("click", () => {
        this.saveUserSettings();
      });
    }
    
    // 全局点击事件委托
    document.addEventListener('click', (e) => {
      // 处理字符点击，加载字详情
      if (e.target.classList.contains('character-item')) {
        this.searchCharacter(e.target.textContent);
      }
      
      // 处理“标记为已学习”按钮
      if (e.target.id === 'markLearned') {
        this.markCurrentCharacterAsLearned();
      }
    });
  }
  
  // 加载用户画像
  async loadUserProfile() {
    // 获取用户画像
    this.userProfile = UserProfileManager.getProfile();
    
    // 更新界面显示
    this.updateUserInfo();
    
    // 获取初始推荐
    this.loadRecommendations();
    
    return this.userProfile;
  }
  
  // 更新用户信息显示
  updateUserInfo() {
    const profileElement = document.getElementById("userProfile");
    if (!profileElement) return;
    
    const profile = this.userProfile;
    const learnedCount = profile.learnedCharacters ? profile.learnedCharacters.length : 0;
    
    profileElement.innerHTML = `
      <div class="profile-info">
        <p><strong>年级:</strong> ${profile.grade}年级</p>
        <p><strong>学习级别:</strong> ${profile.level || 1}</p>
        <p><strong>已学汉字:</strong> ${learnedCount}个</p>
        <p><strong>兴趣领域:</strong> ${profile.interests.join('、') || '未设置'}</p>
        <p><strong>最近活动:</strong> ${profile.lastActivity ? new Date(profile.lastActivity).toLocaleDateString() : '无'}</p>
      </div>
    `;
  }
  
  // 更新界面控件状态
  updateUIControls() {
    // 设置年级选择器
    const gradeSelect = document.getElementById("gradeSelect");
    if (gradeSelect) {
      gradeSelect.value = this.userProfile.grade || "1";
    }
    
    // 设置兴趣复选框
    const interestCheckboxes = document.querySelectorAll(".interest-checkbox");
    interestCheckboxes.forEach(checkbox => {
      checkbox.checked = this.userProfile.interests && this.userProfile.interests.includes(checkbox.value);
    });
  }
  
  // 保存用户设置
  saveUserSettings() {
    // 获取选择的年级
    const gradeSelect = document.getElementById("gradeSelect");
    const grade = parseInt(gradeSelect.value);
    
    // 获取选中的兴趣
    const interestCheckboxes = document.querySelectorAll(".interest-checkbox:checked");
    const interests = Array.from(interestCheckboxes).map(cb => cb.value);
    
    // 更新用户画像
    UserProfileManager.setGrade(grade);
    UserProfileManager.updateInterests(interests);
    
    // 重新加载用户画像
    this.loadUserProfile();
    
    // 提供反馈
    alert("用户设置已保存!");
    
    // 重新加载推荐
    this.loadRecommendations();
  }
  
  // 搜索汉字
  async searchCharacter(character) {
    if (!character || character.length !== 1) {
      this.showMessage("请输入一个汉字", "error");
      return;
    }
    
    const resultDiv = document.getElementById("result");
    resultDiv.innerHTML = "<p class='loading-spinner'>正在查询汉字信息，请稍候...</p>";
    
    try {
      // 获取汉字数据
      const characterData = await this.dataService.getCharacter(character);
      
      // 获取AI分析
      const aiAnalysis = await this.dataService.getCharacterAnalysis(character);
      
      // 获取相关汉字
      const relatedResponse = await this.dataService.getRelatedCharacters(character, this.userProfile);
      const relatedChars = relatedResponse.related_characters || [];
      
      // 更新当前汉字
      this.currentCharacter = character;
      
      // 显示结果
      this.displayCharacterResult(characterData, aiAnalysis, relatedChars);
      
      // 加载演化图谱
      this.loadCharacterEvolution(character);
      
      // 自动滚动到结果区域
      resultDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      console.error("查询汉字失败:", error);
      resultDiv.innerHTML = `<p class="error">查询汉字"${character}"时出错。请稍后再试。</p>`;
    }
  }
  
  // 显示汉字查询结果
  displayCharacterResult(characterData, aiAnalysis, relatedChars) {
    const resultDiv = document.getElementById("result");
    
    if (!characterData) {
      resultDiv.innerHTML = `<p class="error">未找到该汉字的信息。</p>`;
      return;
    }
    
    // 构建结果HTML
    const componentsHTML = characterData.components && characterData.components.length > 0 
      ? `<div class="character-section">
          <h3>组成部件</h3>
          <p class="components">${characterData.components.map(c => 
            `<span class="component character-item">${c}</span>`).join('')}
          </p>
        </div>` 
      : '';
    
    const commonWordsHTML = characterData.commonWords && characterData.commonWords.length > 0 
      ? `<div class="character-section">
          <h3>常见词语</h3>
          <p class="common-words">${characterData.commonWords.join('、')}</p>
        </div>` 
      : '';
    
    resultDiv.innerHTML = `
      <div class="character-details">
        <h2 class="character-main">${characterData.character}</h2>
        
        <div class="character-type-badge">${characterData.type || '未知类型'}</div>
        
        <div class="character-info">
          <div class="character-section">
            <h3>汉字解析</h3>
            <p>${characterData.explanation || '暂无解释'}</p>
          </div>
          
          ${componentsHTML}
          ${commonWordsHTML}
          
          <div class="character-section">
            <h3>相关汉字</h3>
            <div class="related-characters">
              ${relatedChars.map(item => 
                `<div class="related-item">
                  <span class="character-item">${item.character}</span>
                  <span class="relation-type">${item.relation || item.type || '相关字'}</span>
                 </div>`
              ).join('')}
            </div>
          </div>
          
          <div class="character-section ai-analysis">
            <h3>AI详细分析</h3>
            <div class="analysis-content">${aiAnalysis}</div>
          </div>
          
          <button id="markLearned" class="learn-button">标记为已学习</button>
        </div>
      </div>
    `;
  }
  
  // 加载汉字演化图谱
  async loadCharacterEvolution(character) {
    // 显示演化图谱区域
    const evolutionSection = document.getElementById("evolution-section");
    const evolutionContent = document.getElementById("evolutionContent");
    
    if (!evolutionSection || !evolutionContent) return;
    
    evolutionSection.classList.remove("hidden");
    evolutionContent.innerHTML = "<p class='loading-spinner'>正在加载演化图谱...</p>";
    
    try {
      // 获取演化描述
      const evolutionDesc = await this.dataService.getCharacterEvolution(character);
      
      // 更新显示
      evolutionContent.innerHTML = evolutionDesc;
    } catch (error) {
      console.error("加载演化图谱失败:", error);
      evolutionContent.innerHTML = `<p class="error">抱歉，无法加载"${character}"的演化图谱。</p>`;
    }
  }
  
  // 加载推荐的汉字
  async loadRecommendations() {
    const list = document.getElementById("recommendList");
    list.innerHTML = "<li class='loading-spinner'>加载推荐中...</li>";
    
    try {
      let recommendedChars;
      
      if (this.currentCharacter) {
        // 如果有当前选中的字，获取相关推荐
        const relatedResponse = await this.dataService.getRelatedCharacters(this.currentCharacter, this.userProfile);
        recommendedChars = relatedResponse.related_characters || [];
      } else {
        // 否则获取一般推荐
        recommendedChars = await this.dataService.getRecommendedCharacters(this.userProfile);
      }
      
      // 更新显示
      list.innerHTML = '';
      if (recommendedChars && recommendedChars.length > 0) {
        recommendedChars.forEach(item => {
          const li = document.createElement("li");
          if (typeof item === 'string') {
            li.innerHTML = `<span class="character-item">${item}</span>`;
          } else {
            li.innerHTML = `
              <div class="recommend-item">
                <span class="character-item">${item.character}</span>
                <span class="recommend-reason">${item.reason || item.type || ''}</span>
              </div>
            `;
          }
          list.appendChild(li);
        });
      } else {
        list.innerHTML = "<li>暂无推荐汉字</li>";
      }
    } catch (error) {
      console.error("加载推荐失败:", error);
      list.innerHTML = "<li class='error'>无法加载推荐。请稍后再试。</li>";
    }
  }
  
  // 标记当前汉字为已学习
  markCurrentCharacterAsLearned() {
    if (!this.currentCharacter) {
      this.showMessage("请先选择一个汉字", "error");
      return;
    }
    
    // 更新用户画像
    UserProfileManager.markCharacterAsLearned(this.currentCharacter);
    
    // 更新UI
    this.updateUserInfo();
    
    // 提供反馈
    this.showMessage(`成功将"${this.currentCharacter}"标记为已学习！`, "success");
    
    // 加载新的推荐
    this.loadRecommendations();
  }
  
  // 显示消息
  showMessage(message, type = "info") {
    alert(message); // 简单实现，可以改为更友好的UI消息显示机制
  }
}

// 等待DOM加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
  window.hanziApp = new HanziLearningApp();
});