window.Storage = {
    async save(key, data) {
        try {
            if (window.Telegram?.WebApp?.CloudStorage) {
                await window.Telegram.WebApp.CloudStorage.setItem(key, JSON.stringify(data));
            } else {
                localStorage.setItem(`racing_${key}`, JSON.stringify(data));
            }
        } catch (error) {
            console.error('Storage failed:', error);
        }
    },
    
    async load(key) {
        try {
            if (window.Telegram?.WebApp?.CloudStorage) {
                const data = await window.Telegram.WebApp.CloudStorage.getItem(key);
                return data ? JSON.parse(data) : null;
            } else {
                const data = localStorage.getItem(`racing_${key}`);
                return data ? JSON.parse(data) : null;
            }
        } catch (error) {
            console.error('Storage load failed:', error);
            return null;
        }
    }
};
