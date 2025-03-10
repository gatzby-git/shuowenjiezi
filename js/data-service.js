// 数据服务封装：包装调用AI服务和Firebase数据服务

import AICharacterService from "./ai-service.js";
import FirebaseCharacterDB from "./firebase-config.js";

class CharacterDataService {
  // 尝试先从Firebase获取数据，如果没有，再调用AI服务
  async getCharacter(character) {
    // 先尝试Firebase
    const firebaseData = await FirebaseCharacterDB.getCharacter(character);
    if (firebaseData) {
      return firebaseData;
    }
    // 若Firebase中没有记录，则调用AI服务
    return await AICharacterService.getCharacter(character);
  }
  
  async getCharacterAnalysis(character) {
    return await AICharacterService.analyzeCharacter(character);
  }
  
  async getRelatedCharacters(character, userProfile) {
    return await AICharacterService.getRelatedCharacters(character, userProfile);
  }
  
  async getCharacterEvolution(character) {
    return await AICharacterService.generateEvolutionDescription(character);
  }
  
  async getRecommendedCharacters(userProfile) {
    // 如果用户设置了兴趣，则优先基于兴趣推荐
    if (userProfile && userProfile.interests && userProfile.interests.length > 0) {
      return await AICharacterService.getRecommendedCharactersByInterest(
        userProfile.interests[0],
        userProfile.grade || 1
      );
    }
    // 否则根据年级推荐
    return await AICharacterService.getRecommendedCharactersByLevel(userProfile.grade || 1);
  }
}

export default new CharacterDataService();