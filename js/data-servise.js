// 用户画像管理
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
    
    // 获取当前用户画像
    getProfile() {
      return { ...this.profile }; // 返回副本避免直接修改
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
      
      // 检查字是否已经学习过
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
      
      // 更新最近活动
      this.profile.lastActivity = timestamp;
      
      // 根据已学习字数调整级别
      this._updateLevel();
      
      // 保存更新后的画像
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
    
    // 私有方法：创建默认用户画像
    _createDefaultProfile() {
      return {
        userId: `user_${Date.now()}`,
        name: "小学生",
        grade: 1, // 默认一年级
        level: 1, // 学习水平
        interests: ["自然", "动物"], // 默认兴趣
        learnedCharacters: [], // 已学习的汉字
        currentLearningPath: "独体象形", // 当前学习路径
        lastActivity: new Date().toISOString(),
        stats: {
          totalLearned: 0, // 总共学习的汉字数
          streak: 0, // 连续学习天数
          sessionsCompleted: 0 // 完成的学习会话
        }
      };
    }
    
    // 私有方法：从本地存储加载用户画像
    _loadProfile() {
      try {
        const savedProfile = localStorage.getItem('userProfile');
        return savedProfile ? JSON.parse(savedProfile) : null;
      } catch (e) {
        console.error("加载用户画像失败:", e);
        return null;
      }
    }
    
    // 私有方法：保存用户画像到本地存储
    _saveProfile() {
      try {
        localStorage.setItem('userProfile', JSON.stringify(this.profile));
      } catch (e) {
        console.error("保存用户画像失败:", e);
      }
    }
    
    // 私有方法：根据学习进度更新级别
    _updateLevel() {
      const count = this.profile.learnedCharacters.length;
      // 简单的级别计算逻辑，可以根据需要调整
      if (count >= 50) this.profile.level = 3;
      else if (count >= 20) this.profile.level = 2;
      else this.profile.level = 1;
    }
  }
  
  export default new UserProfileManager();