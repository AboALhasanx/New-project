function openPanel() {
    document.getElementById('sidePanel').classList.add('is-open');
    document.getElementById('panelScrim').classList.add('is-open');
}

function closePanel() {
    document.getElementById('sidePanel').classList.remove('is-open');
    document.getElementById('panelScrim').classList.remove('is-open');
}

function updateSubject(value) {
    state.subject = value;
    renderAll();
    scheduleAutoSave();
}

function updateChapter(value) {
    state.chapter = value;
    renderAll();
    scheduleAutoSave();
}

function updateYear(value) {
    state.year = value;
    renderAll();
    scheduleAutoSave();
}

function deletePage(index) {
    if (!state.pages[index]) {
        return;
    }

    const accepted = window.confirm('هل تريد حذف هذه الصفحة؟');
    if (!accepted) {
        return;
    }

    state.pages.splice(index, 1);
    renderAll();
    scheduleAutoSave();
    showToast('تم حذف الصفحة');
}

function movePage(index, direction) {
    const targetIndex = index + direction;
    if (!state.pages[index] || targetIndex < 0 || targetIndex >= state.pages.length) {
        return;
    }

    const [page] = state.pages.splice(index, 1);
    state.pages.splice(targetIndex, 0, page);
    renderAll();
    scheduleAutoSave();
    showToast('تم تحريك الصفحة');
}

function exportData() {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const safeName = (state.subject.trim() || 'project')
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, '-');

    anchor.href = url;
    anchor.download = `${safeName || 'project'}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast('تم تصدير JSON');
}

function importData(file) {
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const parsed = JSON.parse(reader.result);
            if (!parsed || !Array.isArray(parsed.pages)) {
                showToast('ملف غير صالح: pages غير موجودة');
                return;
            }

            state = normalizeProject(parsed);
            renderAll();
            saveLocal();
            showToast('تم استيراد المشروع');
        } catch (error) {
            console.error('Import failed:', error);
            showToast('تعذر قراءة ملف JSON');
        } finally {
            document.getElementById('importFile').value = '';
        }
    };
    reader.readAsText(file, 'utf-8');
}

let toastTimer = null;

function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        toast.classList.remove('is-visible');
    }, 2200);
}

function bindEvents() {
    document.getElementById('pagesBtn').addEventListener('click', openPanel);
    document.getElementById('closePanelBtn').addEventListener('click', closePanel);
    document.getElementById('panelScrim').addEventListener('click', closePanel);
    document.getElementById('addPageBtn').addEventListener('click', openAddModal);
    document.getElementById('panelAddPageBtn').addEventListener('click', openAddModal);
    document.getElementById('promptBtn').addEventListener('click', openPromptModal);
    document.getElementById('printBtn').addEventListener('click', () => window.print());
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', (event) => importData(event.target.files[0]));
    document.getElementById('clearLocalBtn').addEventListener('click', clearLocal);

    document.getElementById('subjectInput').addEventListener('input', (event) => updateSubject(event.target.value));
    document.getElementById('chapterInput').addEventListener('input', (event) => updateChapter(event.target.value));
    document.getElementById('yearInput').addEventListener('input', (event) => updateYear(event.target.value));

    document.getElementById('savePageBtn').addEventListener('click', savePage);
    document.getElementById('cancelPageBtn').addEventListener('click', () => closeModal('pageModal'));
    document.getElementById('closePageModalBtn').addEventListener('click', () => closeModal('pageModal'));
    document.getElementById('copyPromptBtn').addEventListener('click', copyPrompt);
    document.getElementById('cancelPromptBtn').addEventListener('click', () => closeModal('promptModal'));
    document.getElementById('closePromptModalBtn').addEventListener('click', () => closeModal('promptModal'));

    document.querySelectorAll('.modal-backdrop').forEach((backdrop) => {
        backdrop.addEventListener('click', (event) => {
            if (event.target === backdrop) {
                closeModal(backdrop.id);
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        const isCtrl = event.ctrlKey || event.metaKey;

        if (event.key === 'Escape') {
            closePanel();
            closeModal('pageModal');
            closeModal('promptModal');
        }

        if (isCtrl && event.key.toLowerCase() === 's') {
            event.preventDefault();
            saveLocal();
            showToast('تم الحفظ');
        }

        if (isCtrl && event.key.toLowerCase() === 'p') {
            event.preventDefault();
            window.print();
        }

        if (isCtrl && event.key.toLowerCase() === 'n') {
            event.preventDefault();
            openAddModal();
        }
    });

    window.addEventListener('resize', () => {
        window.clearTimeout(window.__sdreResizeTimer);
        window.__sdreResizeTimer = window.setTimeout(checkOverflow, 150);
    });
}

window.onload = () => {
    loadLocal();
    bindEvents();
    renderAll();
};
