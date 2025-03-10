// 统一的汉字数据访问服务 - 结合Firebase和AI服务
import FirebaseCharacterDB from './firebase-config.js';
import AICharacterService from './ai-service.js';

class CharacterDataService {
  constructor() {
    this.firebase = FirebaseCharacterDB;
    this.ai = AICharacterService;
    this.useAIFallback = true; // 是否在数据库无数据时使用AI
  }
  
  // 获取汉字数据，优先使用数据库，回退到AI
  async getCharacter(character) {
    try {
      // 先从数据库获取
      let characterData = await this.firebase.getCharacter(character);
      
      // 如果数据库中没有且启用了AI回退
      if (!characterData && this.useAIFallback) {
        console.log("数据库中未找到汉字，使用AI获取:", character);
        characterData = await this.ai.getCharacter(character);
      }
      
      return characterData || {
        character: character,
        explanation: "暂无该汉字的信息。",
        components: [],
        relatedCharacters: []
      };
    } catch (error) {
      console.error("获取汉字数据出错:", error);
      // 出错时返回基础数据
      return {
        character: character,
        explanation: "获取信息时出错，请稍后再试。",
        components: [],
        relatedCharacters: []
      };
    }
  }
  
  // 获取汉字的详细分析
  async getCharacterAnalysis(character) {
    try {
      // 这个总是使用AI，因为需要动态生成详细分析
      const analysis = await this.ai.analyzeCharacter(character);
      return analysis;
    } catch (error) {
      console.error("汉字分析获取失败:", error);
      return "抱歉，无法获取该汉字的详细分析。";
    }
  }
  
  // 获取汉字演化图谱
  async getCharacterEvolution(character) {
    try {
      // 演化图谱信息需要动态生成，使用AI
      const evolution = await this.ai.generateEvolutionDescription(character);
      return evolution;
    } catch (error) {
      console.error("获取演化图谱失败:", error);
      return "抱歉，无法获取该汉字的演化图谱。";
    }
  }
  
  // 获取推荐汉字
  async getRecommendedCharacters(userProfile) {
    try {
      const { level = 1, interests = [], grade = 1 } = userProfile || {};
      
      // 如果有兴趣设置，使用兴趣推荐
      if (interests && interests.length > 0) {
        // 随机选择一个兴趣领域
        const randomInterest = interests[Math.floor(Math.random() * interests.length)];
        return await this.ai.getRecommendedCharactersByInterest(randomInterest, grade, 8);
      } 
      
      // 否则按级别推荐
      return await this.ai.getRecommendedCharactersByLevel(grade, 8);
    } catch (error) {
      console.error("获取推荐汉字失败:", error);
      return this._getDefaultRecommendations(userProfile?.grade || 1);
    }
  }
  
  // 获取下一步学习汉字
  async getNextLearningCharacters(userProfile) {
    try {
      const { grade = 1, learnedCharacters = [] } = userProfile || {};
      
      // 先尝试获取学习路径
      const pathway = await this.firebase.getLearningPathway(grade);
      
      if (pathway && pathway.characters && pathway.characters.length > 0) {
        // 过滤出未学习的字符
        const unlearned = pathway.characters.filter(char => 
          !learnedCharacters.includes(char)
        );
        
        // 如果还有未学习的，返回前5个
        if (unlearned.length > 0) {
          return unlearned.slice(0, 5).map(char => ({
            character: char,
            type: "学习路径",
            reason: "学习路径推荐"
          }));
        }
      }
      
      // 如果学习路径中的汉字都学习完了，或者没有学习路径，使用AI推荐
      return await this.ai.getRecommendedCharactersByLevel(grade, 5);
    } catch (error) {
      console.error("获取下一步学习汉字失败:", error);
      return this._getDefaultRecommendations(userProfile?.grade || 1);
    }
  }
  
  // 获取相关汉字
  async getRelatedCharacters(character, userProfile) {
    try {
      const result = await this.ai.getRelatedCharacters(character, userProfile || {});
      return result;
    } catch (error) {
      console.error("获取相关汉字失败:", error);
      return { 
        related_characters: [
          { character: "人", relation: "基础汉字", type: "独体象形" },
          { character: "口", relation: "基础汉字", type: "独体象形" },
          { character: "日", relation: "基础汉字", type: "独体象形" },
          { character: "月", relation: "基础汉字", type: "独体象形" },
          { character: "木", relation: "基础汉字", type: "独体象形" }
        ]
      };
    }
  }
  
  // 默认推荐
  _getDefaultRecommendations(grade = 1) {
    const defaults = {
      1: [
        {"character": "人", "type": "独体象形", "reason": "基础汉字"},
        {"character": "口", "type": "独体象形", "reason": "基础汉字"},
        {"character": "日", "type": "独体象形", "reason": "基础汉字"},
        {"character": "月", "type": "独体象形", "reason": "基础汉字"},
        {"character": "木", "type": "独体象形", "reason": "基础汉字"}
      ],
      2: [
        {"character": "林", "type": "基础会意", "reason": "由两个'木'组成"},
        {"character": "从", "type": "基础会意", "reason": "由两个'人'组成"},
        {"character": "明", "type": "基础会意", "reason": "由'日'和'月'组成"},
        {"character": "好", "type": "基础会意", "reason": "由'女'和'子'组成"},
        {"character": "休", "type": "基础会意", "reason": "由'人'和'木'组成"}
      ]
    };
    
    return defaults[grade] || defaults[1];
  }
}

export default new CharacterDataService();