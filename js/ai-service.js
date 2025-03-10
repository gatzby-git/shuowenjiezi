// DeepSeek AI服务封装 - 优化版

const DEEPSEEK_API_KEY = "sk-ad01995ea5054ad7999f4ae89e88592a"; // 您的API密钥
// 根据 DeepSeek API 文档，为了兼容 OpenAI 格式，建议将 base_url 设置为 "https://api.deepseek.com/v1"
const API_BASE_URL = "https://api.deepseek.com/v1"; 
const API_ENDPOINT = "/chat/completions"; // 完整endpoint为 https://api.deepseek.com/v1/chat/completions

class AICharacterService {
  constructor() {
    // 初始化缓存
    this.cache = this._loadCache();
    this.maxRetries = 2; // 最大重试次数
  }
  
  // 获取汉字详细信息
  async getCharacter(character) {
    if (!character || typeof character !== 'string' || character.length !== 1) {
      console.error("无效的汉字输入:", character);
      return null;
    }
    
    if (this.cache.characters && this.cache.characters[character]) {
      console.log("从缓存中获取汉字数据:", character);
      return this.cache.characters[character];
    }
    
    console.log("从AI获取汉字数据:", character);
    
    try {
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
      
      let response = await this._callDeepSeekAPI(prompt, "deepseek-chat");
      
      let characterData;
      try {
        const jsonMatch = this._extractJSON(response);
        if (jsonMatch) {
          characterData = JSON.parse(jsonMatch);
          if (!characterData.character) {
            characterData.character = character;
          }
        } else {
          throw new Error("无法从响应中提取JSON");
        }
      } catch (parseError) {
        console.warn("解析 deepseek-chat 响应失败:", parseError.message);
        console.info("deepseek-chat 原始响应:", response);
        // 如果 deepseek-chat 解析失败，尝试使用 deepseek-reasoner 模型重新调用
        response = await this._callDeepSeekAPI(prompt, "deepseek-reasoner");
        try {
          const jsonMatch = this._extractJSON(response);
          if (jsonMatch) {
            characterData = JSON.parse(jsonMatch);
            if (!characterData.character) {
              characterData.character = character;
            }
          } else {
            throw new Error("无法从 deepseek-reasoner 响应中提取JSON");
          }
        } catch (parseError2) {
          console.warn("解析 deepseek-reasoner 响应失败:", parseError2.message);
          console.info("deepseek-reasoner 原始响应:", response);
          // 若全部失败，则返回 fallback 数据
          characterData = {
            character: character,
            type: "未知",
            level: 1,
            explanation: this._extractPlainText(response, 500) + " (deepseek 调用失败)",
            components: [],
            evolution: [],
            relatedCharacters: [],
            commonWords: []
          };
        }
      }
      
      if (!this.cache.characters) this.cache.characters = {};
      this.cache.characters[character] = characterData;
      this._saveCache();
      
      return characterData;
    } catch (error) {
      console.error("AI汉字数据获取失败:", error.message);
      return {
        character: character,
        explanation: "抱歉，无法获取该汉字的信息。deepseek 调用失败",
        components: [],
        relatedCharacters: []
      };
    }
  }
  
  // 从文本中提取JSON
  _extractJSON(text) {
    if (!text) return null;
    // 尝试使用简化逻辑：直接查找首个 '{' 到最后一个 '}'
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start !== -1 && end !== -1 && end > start) {
      const candidate = text.substring(start, end + 1);
      try {
        JSON.parse(candidate);
        return candidate;
      } catch (e) {
        // 如果直接解析失败，则再尝试原有多模式正则方法
      }
    }
    
    const patterns = [
      /```json\s*([\s\S]*?)\s*```/i,
      /```\s*([\s\S]*?)\s*```/i,
      /\{[\s\S]*\}/
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        try {
          JSON.parse(match[1]);
          return match[1];
        } catch (e) {
          continue;
        }
      } else if (match) {
        try {
          JSON.parse(match[0]);
          return match[0];
        } catch (e) {
          continue;
        }
      }
    }
    
    console.warn("未能提取有效的 JSON 片段");
    return null;
  }
  
  // 从响应中提取纯文本
  _extractPlainText(text, maxLength = 1000) {
    if (!text) return "";
    const cleanText = text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[.*?\]\(.*?\)/g, '')
      .replace(/#+\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .trim();
    return cleanText.substring(0, maxLength);
  }
  
  // 分析汉字结构和来源
  async analyzeCharacter(character) {
    if (!character || typeof character !== 'string' || character.length !== 1) {
      return "请提供有效的单个汉字进行分析。";
    }
    
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
    
    try {
      const analysis = await this._callDeepSeekAPI(prompt, "deepseek-chat");
      if (!this.cache.analyses) this.cache.analyses = {};
      this.cache.analyses[cacheKey] = analysis;
      this._saveCache();
      return analysis;
    } catch (error) {
      console.error("获取汉字分析失败:", error.message);
      return `抱歉，暂时无法分析"${character}"字。deepseek 调用失败`;
    }
  }
  
  // 获取汉字演化图谱描述
  async generateEvolutionDescription(character) {
    if (!character || typeof character !== 'string' || character.length !== 1) {
      return "请提供有效的单个汉字查询演化过程。";
    }
    
    const cacheKey = `evolution_${character}`;
    if (this.cache.evolutions && this.cache.evolutions[cacheKey]) {
      return this.cache.evolutions[cacheKey];
    }
    
    const prompt = `请详细描述汉字"${character}"从甲骨文到现代汉字的演变过程。
包括各个历史时期的字形变化及其理据。描述要生动形象，适合小学生理解。
如果您知道具体的字形演变，请简要描述每个阶段的视觉特征，如果不确定，请基于汉字构形原理进行合理推测。`;
    
    try {
      const evolution = await this._callDeepSeekAPI(prompt, "deepseek-chat");
      if (!this.cache.evolutions) this.cache.evolutions = {};
      this.cache.evolutions[cacheKey] = evolution;
      this._saveCache();  
      return evolution;
    } catch (error) {
      console.error("获取汉字演化描述失败:", error.message);
      return `抱歉，暂时无法获取"${character}"的演化描述。deepseek 调用失败`;
    }
  }
  
  // 根据级别获取推荐汉字
  async getRecommendedCharactersByLevel(level, count = 10) {
    level = parseInt(level) || 1;
    if (level < 1 || level > 6) level = 1;
    count = parseInt(count) || 10;
    if (count < 1 || count > 20) count = 10;
    
    const cacheKey = `level_${level}`;
    if (this.cache.recommendations && 
        this.cache.recommendations[cacheKey] && 
        this.cache.recommendations[cacheKey].timestamp > Date.now() - 86400000) {
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
      
      const response = await this._callDeepSeekAPI(prompt, "deepseek-chat");
      let recommendedChars;
      try {
        const jsonStr = this._extractJSON(response);
        if (jsonStr) {
          const data = JSON.parse(jsonStr);
          recommendedChars = data.characters || [];
          recommendedChars = recommendedChars.filter(item => 
            item && typeof item === 'object' && item.character && 
            typeof item.character === 'string' && item.character.length === 1
          );
        } else {
          throw new Error("无法从响应中提取JSON");
        }
      } catch (parseError) {
        console.warn("解析AI推荐失败:", parseError.message);
        return this._getDefaultCharacters(level);
      }
      
      if (!recommendedChars || recommendedChars.length === 0) {
        return this._getDefaultCharacters(level);
      }
      
      if (!this.cache.recommendations) this.cache.recommendations = {};
      this.cache.recommendations[cacheKey] = {
        timestamp: Date.now(),
        data: recommendedChars
      };
      this._saveCache();
      
      return recommendedChars;
    } catch (error) {
      console.error("获取推荐汉字失败:", error.message);
      return this._getDefaultCharacters(level);
    }
  }
  
  // 根据兴趣获取推荐汉字
  async getRecommendedCharactersByInterest(interest, level, count = 10) {
    if (!interest || typeof interest !== 'string') {
      return this._getDefaultCharacters(level);
    }
    
    level = parseInt(level) || 1;
    if (level < 1 || level > 6) level = 1;
    count = parseInt(count) || 10;
    if (count < 1 || count > 20) count = 10;
    
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
      
      const response = await this._callDeepSeekAPI(prompt, "deepseek-chat");
      let recommendedChars;
      try {
        const jsonStr = this._extractJSON(response);
        if (jsonStr) {
          const data = JSON.parse(jsonStr);
          recommendedChars = data.characters || [];
          recommendedChars = recommendedChars.filter(item => 
            item && typeof item === 'object' && item.character && 
            typeof item.character === 'string' && item.character.length === 1
          );
        } else {
          throw new Error("无法从响应中提取JSON");
        }
      } catch (parseError) {
        console.warn("解析AI推荐失败:", parseError.message);
        return this._getDefaultCharacters(level);
      }
      
      if (!recommendedChars || recommendedChars.length === 0) {
        return this._getDefaultCharacters(level);
      }
      
      if (!this.cache.recommendations) this.cache.recommendations = {};
      this.cache.recommendations[cacheKey] = {
        timestamp: Date.now(),
        data: recommendedChars
      };
      this._saveCache();
      
      return recommendedChars;
    } catch (error) {
      console.error("获取兴趣推荐汉字失败:", error.message);
      return this._getDefaultCharacters(level);
    }
  }
  
  // 获取相关汉字
  async getRelatedCharacters(character, userProfile = {}) {
    if (!character || typeof character !== 'string' || character.length !== 1) {
      return { related_characters: [] };
    }
    
    const level = parseInt(userProfile.grade) || 1;
    const interests = Array.isArray(userProfile.interests) ? userProfile.interests : [];
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
    
    try {
      const response = await this._callDeepSeekAPI(prompt, "deepseek-chat");
      try {
        const jsonStr = this._extractJSON(response);
        if (jsonStr) {
          const data = JSON.parse(jsonStr);
          if (data.related_characters && Array.isArray(data.related_characters)) {
            data.related_characters = data.related_characters.filter(item => 
              item && typeof item === 'object' && item.character && 
              typeof item.character === 'string' && item.character.length === 1
            );
            return data;
          }
        }
        const chars = response.split(/[,，、]/)
          .map(c => c.trim())
          .filter(c => c.length === 1)
          .slice(0, 8);
        return { 
          related_characters: chars.map(c => ({
            character: c,
            relation: "相关字",
            type: "未知"
          }))
        };
      } catch (e) {
        console.warn("解析DeepSeek响应失败:", e.message);
        return { related_characters: [] };
      }
    } catch (error) {
      console.error("获取相关汉字失败:", error.message);
      return { related_characters: [] };
    }
  }
  
  // 调用DeepSeek API (带重试机制)
  async _callDeepSeekAPI(prompt, model = "deepseek-chat", retryCount = 0) {
    try {
      const response = await fetch(`${API_BASE_URL}${API_ENDPOINT}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model, // 使用传入的模型参数，默认为 deepseek-chat
          messages: [
            { 
              role: "system", 
              content: "你是一位汉字专家，精通文字学、训诂学和汉字教育，尤其擅长用生动易懂的方式向小学生解释汉字的构造和历史演变。" 
            },
            { 
              role: "user", 
              content: prompt 
            }
          ],
          max_tokens: 1000,
          temperature: 0.5,
          top_p: 0.9
        })
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`API调用失败: ${response.status} - ${errorData}`);
      }
      
      const data = await response.json();
      if (!data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        throw new Error("API响应格式无效");
      }
      
      return data.choices[0].message.content;
    } catch (error) {
      console.error(`DeepSeek API调用错误 (尝试 ${retryCount + 1}/${this.maxRetries + 1}) 模型(${model}):`, error.message);
      if (retryCount < this.maxRetries) {
        const backoffTime = Math.pow(2, retryCount) * 1000;
        console.log(`${backoffTime}毫秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return this._callDeepSeekAPI(prompt, model, retryCount + 1);
      }
      // 当所有重试失败后，将错误消息中附加显示“deepseek 调用失败”
      throw new Error("deepseek 调用失败: " + error.message);
    }
  }
  
  // 从localStorage加载缓存
  _loadCache() {
    try {
      const savedCache = localStorage.getItem('aiCharacterCache');
      if (savedCache) {
        const parsedCache = JSON.parse(savedCache);
        return parsedCache || {
          characters: {},
          recommendations: {},
          analyses: {},
          evolutions: {}
        };
      }
    } catch (e) {
      console.warn("加载缓存失败:", e.message);
    }
    return {
      characters: {},
      recommendations: {},
      analyses: {},
      evolutions: {}
    };
  }
  
  // 保存缓存到localStorage
  _saveCache() {
    try {
      const cacheStr = JSON.stringify(this.cache);
      if (cacheStr.length > 4.5 * 1024 * 1024) {
        console.warn("缓存接近大小限制，执行清理...");
        this.cache.recommendations = {};
      }
      localStorage.setItem('aiCharacterCache', JSON.stringify(this.cache));
    } catch (e) {
      console.warn("保存缓存失败:", e.message);
      if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
        this.cache.recommendations = {};
        this.cache.analyses = {};
        try {
          localStorage.setItem('aiCharacterCache', JSON.stringify(this.cache));
        } catch (retryError) {
          console.error("二次保存缓存仍然失败:", retryError.message);
        }
      }
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
      ]
    };
    return defaults[level] || defaults[1];
  }
}

export default new AICharacterService();