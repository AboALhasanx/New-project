const STORAGE_KEY = 'sdre_publisher_project_v1';
let autoSaveTimer = null;

function normalizeProject(project) {
    return {
        subject: typeof project.subject === 'string' ? project.subject : '',
        chapter: typeof project.chapter === 'string' ? project.chapter : '',
        year: typeof project.year === 'string' ? project.year : '2026',
        pages: Array.isArray(project.pages)
            ? project.pages.map((page) => ({
                topic: typeof page.topic === 'string' ? page.topic : '',
                content: typeof page.content === 'string' ? page.content : ''
            }))
            : []
    };
}

function saveLocal() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        return true;
    } catch (error) {
        console.error('Unable to save project locally:', error);
        return false;
    }
}

function loadLocal() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            return false;
        }

        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.pages)) {
            return false;
        }

        state = normalizeProject(parsed);
        return true;
    } catch (error) {
        console.error('Unable to load local project:', error);
        return false;
    }
}

function scheduleAutoSave() {
    window.clearTimeout(autoSaveTimer);
    autoSaveTimer = window.setTimeout(() => {
        const saved = saveLocal();
        if (saved && typeof showToast === 'function') {
            showToast('تم الحفظ تلقائياً');
        }
    }, 600);
}

function clearLocal() {
    try {
        localStorage.removeItem(STORAGE_KEY);
        if (typeof showToast === 'function') {
            showToast('تم مسح الحفظ المحلي');
        }
    } catch (error) {
        console.error('Unable to clear local project:', error);
    }
}
