// 用户画像管理模块

class UserProfileManager {
    constructor() {
      // 尝试从本地存储加载用户画像
      this.profile = this._loadProfile();
      
      // 如果没有现有画像，创建默认画像
      if (!this.profile) {
        this.profile = this._createDefaultProfile();
        this._saveProfile();
      }
    }
    
    // 获取当前用户画像（返回副本以避免直接修改）
    getProfile() {
      return { ...this.profile };
    }
    
    // 更新用户兴趣
    updateInterests(interests) {
      this.profile.interests = interests;
      this.profile.lastActivity = new Date().toISOString();
      this._saveProfile();
      return this.profile;
    }
    
    // 记录学过的汉字
    markCharacterAsLearned(character, proficiency = 1) {
      const timestamp = new Date().toISOString();
      
      // 检查该汉字是否已存在于已学列表中
      const existingIndex = this.profile.learnedCharacters.findIndex(c => c.character === character);
      
      if (existingIndex >= 0) {
        // 更新现有记录
        this.profile.learnedCharacters[existingIndex].proficiency = proficiency;
        this.profile.learnedCharacters[existingIndex].lastReviewed = timestamp;
        this.profile.learnedCharacters[existingIndex].reviewCount += 1;
      } else {
        // 添加新记录
        this.profile.learnedCharacters.push({
          character,
          proficiency,
          learnedAt: timestamp,
          lastReviewed: timestamp,
          reviewCount: 1
        });
        
        // 更新统计信息
        this.profile.stats.totalLearned += 1;
      }
      
      // 更新最后活动时间
      this.profile.lastActivity = timestamp;
      
      // 根据已学习汉字数量更新学习级别
      this._updateLevel();
      
      this._saveProfile();
      return this.profile;
    }
    
    // 获取已学习的汉字列表
    getLearnedCharacters() {
      return this.profile.learnedCharacters.map(item => item.character);
    }
    
    // 更新用户年级
    setGrade(grade) {
      if (grade >= 1 && grade <= 6) {
        this.profile.grade = grade;
        this.profile.lastActivity = new Date().toISOString();
        this._saveProfile();
      }
      return this.profile;
    }
    
    // ---------- 私有方法 ----------
    
    // 创建默认用户画像
    _createDefaultProfile() {
      return {
        userId: `user_${Date.now()}`,
        name: "小学生",
        grade: 1,         // 默认一年级
        level: 1,         // 学习水平
        interests: ["自然", "动物"], // 默认兴趣
        learnedCharacters: [],
        currentLearningPath: "独体象形",
        lastActivity: new Date().toISOString(),
        stats: {
          totalLearned: 0,
          streak: 0,
          sessionsCompleted: 0
        }
      };
    }
    
    // 从本地存储加载用户画像
    _loadProfile() {
      try {
        const savedProfile = localStorage.getItem('userProfile');
        return savedProfile ? JSON.parse(savedProfile) : null;
      } catch (e) {
        console.error("加载用户画像失败:", e);
        return null;
      }
    }
    
    // 保存用户画像到本地存储
    _saveProfile() {
      try {
        localStorage.setItem('userProfile', JSON.stringify(this.profile));
      } catch (e) {
        console.error("保存用户画像失败:", e);
      }
    }
    
    // 根据已学习汉字数量更新用户级别
    _updateLevel() {
      const count = this.profile.learnedCharacters.length;
      if (count >= 50) this.profile.level = 3;
      else if (count >= 20) this.profile.level = 2;
      else this.profile.level = 1;
    }
  }
  
  export default new UserProfileManager();