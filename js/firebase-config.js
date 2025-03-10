// Firebase配置与数据库服务

// 初始化Firebase (使用兼容模式)
const firebaseConfig = {
    apiKey: "AIzaSyDMIbLlxxx_placeholder_key_xxx",  // 替换为您的Firebase API密钥
    authDomain: "shuowenjiezi.firebaseapp.com",
    projectId: "shuowenjiezi",
    storageBucket: "shuowenjiezi.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdefghijklmnopqrstuv"
  };
  
  // 检查Firebase是否已经初始化
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }
  
  const db = firebase.firestore();
  
  // 数据库服务封装
  class FirebaseCharacterDB {
    // 获取单个汉字详细信息
    async getCharacter(character) {
      try {
        const characterDoc = await db.collection("characters").doc(character).get();
        
        if (characterDoc.exists) {
          return characterDoc.data();
        } else {
          console.log("未找到汉字数据:", character);
          return null;
        }
      } catch (error) {
        console.error("获取汉字数据错误:", error);
        return null;
      }
    }
    
    // 根据级别获取汉字列表
    async getCharactersByLevel(level) {
      try {
        const snapshot = await db.collection("characters")
          .where("level", "==", level)
          .limit(20)
          .get();
        
        const characters = [];
        snapshot.forEach(doc => {
          characters.push({
            character: doc.id,
            ...doc.data()
          });
        });
        
        return characters;
      } catch (error) {
        console.error("获取汉字列表错误:", error);
        return [];
      }
    }
    
    // 根据类型获取汉字
    async getCharactersByType(type) {
      try {
        const snapshot = await db.collection("characters")
          .where("type", "==", type)
          .limit(20)
          .get();
        
        const characters = [];
        snapshot.forEach(doc => {
          characters.push({
            character: doc.id,
            ...doc.data()
          });
        });
        
        return characters;
      } catch (error) {
        console.error("获取汉字列表错误:", error);
        return [];
      }
    }
    
    // 获取学习路径
    async getLearningPathway(grade) {
      try {
        const pathwayDoc = await db.collection("learningPathways").doc(grade.toString()).get();
        
        if (pathwayDoc.exists) {
          return pathwayDoc.data();
        } else {
          console.log("未找到学习路径数据");
          return { characters: [] };
        }
      } catch (error) {
        console.error("获取学习路径错误:", error);
        return { characters: [] };
      }
    }
    
    // 获取兴趣分类
    async getInterestCategories() {
      try {
        const categoriesDoc = await db.collection("settings").doc("interestCategories").get();
        
        if (categoriesDoc.exists) {
          return categoriesDoc.data();
        } else {
          console.log("未找到兴趣分类数据");
          return {};
        }
      } catch (error) {
        console.error("获取兴趣分类错误:", error);
        return {};
      }
    }
  }
  
  export default new FirebaseCharacterDB();