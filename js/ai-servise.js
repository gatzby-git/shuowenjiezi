// DeepSeek AI服务封装

const DEEPSEEK_API_KEY = "sk-ad01995ea5054ad7999f4ae89e88592a"; // 您的API密钥
const API_URL = "https://api.deepseek.com/v1/chat/completions"; // DeepSeek API兼容OpenAI的端点

class AICharacterService {
  constructor() {
    // 初始化缓存
    this.cache = this._loadCache();
  }
  
  // 获取汉字详细信息
  async getCharacter(character) {
    // 检查缓存
    if (this.cache.characters && this.cache.characters[character]) {
      console.log("从缓存中获取汉字数据:", character);
      return this.cache.characters[character];
    }
    
    console.log("从AI获取汉字数据:", character);
    
    try {
      // 构建提示以请求结构化数据
      const prompt = `请提供汉字"${character}"的以下结构化信息，直接返回JSON格式:
      {
        "character": "${character}",
        "type": "汉字类型(独体象形/基础会意/复合形声)",
        "level": 适合学习的年级数字(1-6),
        "explanation": "详细解释，包括构字理据、本义、演变等",
        "components": ["组成部件列表"],
        "evolution": ["甲骨文描述", "金文描述", "小篆描述", "楷书描述"],
        "relatedCharacters": ["相关汉字1", "相关汉字2"...],
        "commonWords": ["常见词1", "常见词2"...]
      }
      只返回JSON，不要有其他文字。`;
      
      const response = await this._callDeepSeekAPI(prompt);
      let characterData;
      
      try {
        // 尝试解析JSON响应
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          characterData = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error("无法解析JSON响应");
        }
      } catch (parseError) {
        console.error("解析AI响应失败:", parseError);
        
        // 创建基本结构的对象
        characterData = {
          character: character,
          type: "未知",
          level: 1,
          explanation: response.substring(0, 500),
          components: [],
          evolution: [],
          relatedCharacters: [],
          commonWords: []
        };
      }
      
      // 存入缓存
      if (!this.cache.characters) this.cache.characters = {};
      this.cache.characters[character] = characterData;
      this._saveCache();
      
      return characterData;
    } catch (error) {
      console.error("AI汉字数据获取失败:", error);
      return {
        character: character,
        explanation: "抱歉，无法获取该汉字的信息。",
        components: [],
        relatedCharacters: []
      };
    }
  }
  
  // 分析汉字结构和来源
  async analyzeCharacter(character) {
    const cacheKey = `analysis_${character}`;
    if (this.cache.analyses && this.cache.analyses[cacheKey]) {
      return this.cache.analyses[cacheKey];
    }
    
    const prompt = `请详细分析汉字"${character}"的结构组成、字源演变和文化含义，包括：
      1. 该字的部件拆解和构字理据
      2. 从甲骨文、金文到小篆、楷书的演变过程
      3. 字的本义和引申义
      4. 与该字相关的文化背景
      请以适合小学生理解的方式组织回答，语言生动有趣，内容既要专业又要通俗易懂。`;
    
    const analysis = await this._callDeepSeekAPI(prompt);
    
    // 存入缓存
    if (!this.cache.analyses) this.cache.analyses = {};
    this.cache.analyses[cacheKey] = analysis;
    this._saveCache();
    
    return analysis;
  }
  
  // 获取汉字演化图谱描述
  async generateEvolutionDescription(character) {
    const cacheKey = `evolution_${character}`;
    if (this.cache.evolutions && this.cache.evolutions[cacheKey]) {
      return this.cache.evolutions[cacheKey];
    }
    
    const prompt = `请详细描述汉字"${character}"从甲骨文到现代汉字的演变过程。
      包括各个历史时期的字形变化及其理据。描述要生动形象，适合小学生理解。
      如果您知道具体的字形演变，请简要描述每个阶段的视觉特征，如果不确定，请基于汉字构形原理进行合理推测。`;
    
    const evolution = await this._callDeepSeekAPI(prompt);
    
    // 存入缓存
    if (!this.cache.evolutions) this.cache.evolutions = {};
    this.cache.evolutions[cacheKey] = evolution;
    this._saveCache();
    
    return evolution;
  }
  
  // 根据级别获取推荐汉字
  async getRecommendedCharactersByLevel(level, count = 10) {
    // 检查缓存
    const cacheKey = `level_${level}`;
    if (this.cache.recommendations && 
        this.cache.recommendations[cacheKey] && 
        this.cache.recommendations[cacheKey].timestamp > Date.now() - 86400000) { // 一天缓存
      return this.cache.recommendations[cacheKey].data;
    }
    
    try {
      const prompt = `请推荐${count}个适合小学${level}年级学生学习的汉字。
      请按照"独体象形→基础会意→复合形声"的学习顺序推荐。
      直接返回JSON格式:
      {
        "characters": [
          {"character": "字1", "type": "类型", "reason": "推荐理由"},
          {"character": "字2", "type": "类型", "reason": "推荐理由"}
        ]
      }
      只返回JSON，不要有其他文字。`;
      
      const response = await this._callDeepSeekAPI(prompt);
      let recommendedChars;
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          recommendedChars = JSON.parse(jsonMatch[0]).characters;
        } else {
          throw new Error("无法解析JSON响应");
        }
      } catch (parseError) {
        console.error("解析AI推荐失败:", parseError);
        return this._getDefaultCharacters(level);
      }
      
      // 存入缓存
      if (!this.cache.recommendations) this.cache.recommendations = {};
      this.cache.recommendations[cacheKey] = {
        timestamp: Date.now(),
        data: recommendedChars
      };
      this._saveCache();
      
      return recommendedChars;
    } catch (error) {
      console.error("获取推荐汉字失败:", error);
      return this._getDefaultCharacters(level);
    }
  }
  
  // 根据兴趣获取推荐汉字
  async getRecommendedCharactersByInterest(interest, level, count = 10) {
    // 检查缓存
    const cacheKey = `interest_${interest}_level_${level}`;
    if (this.cache.recommendations && 
        this.cache.recommendations[cacheKey] && 
        this.cache.recommendations[cacheKey].timestamp > Date.now() - 86400000) {
      return this.cache.recommendations[cacheKey].data;
    }
    
    try {
      const prompt = `请推荐${count}个与"${interest}"相关的汉字，适合小学${level}年级学生学习。
      请按照"独体象形→基础会意→复合形声"的学习顺序推荐。
      直接返回JSON格式:
      {
        "characters": [
          {"character": "字1", "type": "类型", "reason": "推荐理由"},
          {"character": "字2", "type": "类型", "reason": "推荐理由"}
        ]
      }
      只返回JSON，不要有其他文字。`;
      
      const response = await this._callDeepSeekAPI(prompt);
      let recommendedChars;
      
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          recommendedChars = JSON.parse(jsonMatch[0]).characters;
        } else {
          throw new Error("无法解析JSON响应");
        }
      } catch (parseError) {
        console.error("解析AI推荐失败:", parseError);
        return this._getDefaultCharacters(level);
      }
      
      // 存入缓存
      if (!this.cache.recommendations) this.cache.recommendations = {};
      this.cache.recommendations[cacheKey] = {
        timestamp: Date.now(),
        data: recommendedChars
      };
      this._saveCache();
      
      return recommendedChars;
    } catch (error) {
      console.error("获取兴趣推荐汉字失败:", error);
      return this._getDefaultCharacters(level);
    }
  }
  
  // 获取相关汉字
  async getRelatedCharacters(character, userProfile) {
    const level = userProfile?.level || 1;
    const interests = userProfile?.interests || [];
    
    let interestPrompt = "";
    if (interests.length > 0) {
      interestPrompt = `，特别是与${interests.join('、')}相关的汉字`;
    }
    
    const prompt = `请根据汉字"${character}"，推荐5-8个与之相关的汉字${interestPrompt}。
      相关汉字应符合以下条件：
      1. 与"${character}"形、音、义有关联
      2. 难度适合小学${level}年级的学生
      3. 遵循"独体象形→基础会意→复合形声"的学习顺序
      
      请按照以下JSON格式返回，不要包含其他文本：
      {
        "related_characters": [
          {"character": "字", "relation": "关系说明", "type": "类型"}
        ]
      }`;
    
    const response = await this._callDeepSeekAPI(prompt);
    try {
      // 尝试从文本中提取JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      // 如果无法解析JSON，返回简单处理的结果
      return { 
        related_characters: response.split(/[,，、]/).filter(c => c.trim().length === 1).slice(0, 6).map(c => {
          return { character: c.trim(), relation: "相关字", type: "未知" };
        })
      };
    } catch (e) {
      console.error("解析DeepSeek响应失败:", e);
      return { related_characters: [] };
    }
  }
  
  // 调用DeepSeek API
  async _callDeepSeekAPI(prompt) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: "deepseek-chat", // 或其他可用模型
          messages: [
            { role: "system", content: "你是一位汉字专家，精通文字学、训诂学和汉字教育，尤其擅长用生动易懂的方式向小学生解释汉字的构造和历史演变。" },
            { role: "user", content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status}`);
      }
      
      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("DeepSeek API调用错误:", error);
      return "抱歉，AI服务暂时无法使用。请稍后再试。";
    }
  }
  
  // 从localStorage加载缓存
  _loadCache() {
    try {
      const savedCache = localStorage.getItem('aiCharacterCache');
      return savedCache ? JSON.parse(savedCache) : {
        characters: {},
        recommendations: {},
        pathways: {},
        analyses: {},
        evolutions: {}
      };
    } catch (e) {
      console.error("加载缓存失败:", e);
      return {
        characters: {},
        recommendations: {},
        pathways: {},
        analyses: {},
        evolutions: {}
      };
    }
  }
  
  // 保存缓存到localStorage
  _saveCache() {
    try {
      localStorage.setItem('aiCharacterCache', JSON.stringify(this.cache));
    } catch (e) {
      console.error("保存缓存失败:", e);
    }
  }
  
  // 获取默认汉字列表
  _getDefaultCharacters(level) {
    const defaults = {
      1: [
        {"character": "人", "type": "独体象形", "reason": "基础汉字"},
        {"character": "口", "type": "独体象形", "reason": "基础汉字"},
        {"character": "日", "type": "独体象形", "reason": "基础汉字"},
        {"character": "月", "type": "独体象形", "reason": "基础汉字"},
        {"character": "水", "type": "独体象形", "reason": "基础汉字"}
      ],
      2: [
        {"character": "林", "type": "基础会意", "reason": "由两个'木'组成"},
        {"character": "从", "type": "基础会意", "reason": "由两个'人'组成"},
        {"character": "明", "type": "基础会意", "reason": "由'日'和'月'组成"},
        {"character": "好", "type": "基础会意", "reason": "由'女'和'子'组成"},
        {"character": "休", "type": "基础会意", "reason": "由'人'和'木'组成"}
      ],
      3: [
        {"character": "森", "type": "基础会意", "reason": "由三个'木'组成"},
        {"character": "晶", "type": "基础会意", "reason": "由三个'日'组成"},
        {"character": "花", "type": "形声字", "reason": "艹部与化声"},
        {"character": "草", "type": "形声字", "reason": "艹部与早声"},
        {"character": "虫", "type": "独体象形", "reason": "基础部首"}
      ],
      4: [
        {"character": "楚", "type": "形声字", "reason": "木部与疋声"},
        {"character": "清", "type": "形声字", "reason": "氵部与青声"},
        {"character": "湖", "type": "形声字", "reason": "氵部与胡声"},
        {"character": "晴", "type": "形声字", "reason": "日部与青声"},
        {"character": "暖", "type": "形声字", "reason": "日部与爰声"}
      ],
      5: [
        {"character": "懂", "type": "形声字", "reason": "心部与董声"},
        {"character": "德", "type": "会意字", "reason": "从直从心"},
        {"character": "聪", "type": "形声字", "reason": "耳部与总声"},
        {"character": "慧", "type": "形声字", "reason": "心部与恵声"},
        {"character": "智", "type": "形声字", "reason": "日部与知声"}
      ],
      6: [
        {"character": "璀", "type": "形声字", "reason": "王部与崔声"},
        {"character": "璨", "type": "形声字", "reason": "王部与粲声"},
        {"character": "慈", "type": "形声字", "reason": "心部与兹声"},
        {"character": "礼", "type": "会意字", "reason": "示部与豊声"},
        {"character": "节", "type": "会意字", "reason": "竹部与即声"}
      ]
    };
    
    return defaults[level] || defaults[1];
  }
}

export default new AICharacterService();