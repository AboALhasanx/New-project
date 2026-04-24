function escHtml(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function renderAll() {
    const subjectInput = document.getElementById('subjectInput');
    const chapterInput = document.getElementById('chapterInput');
    const yearInput = document.getElementById('yearInput');
    const projectName = document.getElementById('projectName');
    const preview = document.getElementById('bookPreview');
    const subject = state.subject.trim() || 'اسم المادة';
    const chapter = state.chapter.trim() || 'اسم الفصل';
    const year = state.year.trim() || '2026';

    subjectInput.value = state.subject;
    chapterInput.value = state.chapter;
    yearInput.value = state.year;
    projectName.textContent = state.subject.trim() ? state.subject.trim() : 'مشروع جديد';

    preview.innerHTML = `
        <article class="a4-page cover-page">
            <div class="cover-inner">
                <div class="cover-kicker">SDRE Publisher</div>
                <h1>ملخص الفصل</h1>
                <div class="cover-line"></div>
                <div class="cover-meta">
                    <p><span>المادة</span><strong>${escHtml(subject)}</strong></p>
                    <p><span>الفصل</span><strong>${escHtml(chapter)}</strong></p>
                    <p><span>السنة</span><strong>${escHtml(year)}</strong></p>
                </div>
            </div>
        </article>
        ${state.pages.map((page, index) => renderTopicPageHtml(page, index, chapter)).join('')}
    `;

    document.querySelectorAll('.page-body').forEach((body) => {
        normalizeContentSections(body);
        normalizeInlineDirection(body);
    });
    renderPageList();
    typesetPaginateAndCheckOverflow();
}

function renderTopicPageHtml(page, index, chapter) {
    return `
        <article class="a4-page topic-page" data-source-index="${index}" data-topic="${escHtml(page.topic || 'موضوع بدون عنوان')}" data-chapter="${escHtml(chapter)}">
            <header class="page-header">
                <div class="header-topic">${escHtml(page.topic || 'موضوع بدون عنوان')} - ${escHtml(chapter)}</div>
                <div class="header-count">صفحة</div>
            </header>
            <section class="page-body">${page.content || ''}</section>
        </article>
    `;
}

function renderPageList() {
    const pageList = document.getElementById('pageList');

    if (!state.pages.length) {
        pageList.innerHTML = '<div class="empty-list">لا توجد صفحات بعد.</div>';
        return;
    }

    pageList.innerHTML = state.pages.map((page, index) => `
        <article class="page-list-item">
            <div class="page-list-title">
                <span>${index + 1}</span>
                <strong>${escHtml(page.topic || 'موضوع بدون عنوان')}</strong>
            </div>
            <div class="page-list-actions">
                <button type="button" title="تعديل" aria-label="تعديل" onclick="openEditModal(${index})">تعديل</button>
                <button type="button" title="تحريك للأعلى" aria-label="تحريك للأعلى" onclick="movePage(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button type="button" title="تحريك للأسفل" aria-label="تحريك للأسفل" onclick="movePage(${index}, 1)" ${index === state.pages.length - 1 ? 'disabled' : ''}>↓</button>
                <button type="button" class="danger-text" title="حذف" aria-label="حذف" onclick="deletePage(${index})">حذف</button>
            </div>
        </article>
    `).join('');
}

function normalizeContentSections(contentRoot) {
    let node = contentRoot.firstChild;

    while (node) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
            node = node.nextSibling;
            continue;
        }

        const element = node;

        if (element.classList.contains('content-section') || element.closest('.content-section') !== null) {
            node = element.nextSibling;
            continue;
        }

        if (!isHeadingElement(element)) {
            node = element.nextSibling;
            continue;
        }

        const section = document.createElement('section');
        section.className = 'content-section';
        contentRoot.insertBefore(section, element);

        let cursor = element;
        while (cursor) {
            const next = cursor.nextSibling;
            const isNewSectionStart =
                cursor !== element &&
                cursor.nodeType === Node.ELEMENT_NODE &&
                (isHeadingElement(cursor) || cursor.classList.contains('content-section'));

            if (isNewSectionStart) {
                break;
            }

            section.appendChild(cursor);
            cursor = next;
        }

        node = section.nextSibling;
    }
}

function normalizeInlineDirection(root) {
    const skipSelector = 'code, pre, textarea, script, style, mjx-container, .ltr, .bit, .codeword, .arrow, .status-icon';

    const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode(node) {
                const parent = node.parentElement;
                if (!parent) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (parent.closest(skipSelector)) {
                    return NodeFilter.FILTER_REJECT;
                }

                const text = node.nodeValue || '';
                if (!text.includes('→')) {
                    return NodeFilter.FILTER_REJECT;
                }
                if (!/[\u0600-\u06FF]/.test(text)) {
                    return NodeFilter.FILTER_REJECT;
                }

                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    const nodes = [];
    while (walker.nextNode()) {
        nodes.push(walker.currentNode);
    }

    nodes.forEach((node) => {
        node.nodeValue = node.nodeValue.replaceAll('→', '←');
    });
}

function typesetPaginateAndCheckOverflow() {
    const preview = document.getElementById('bookPreview');

    if (window.MathJax && MathJax.typesetPromise) {
        MathJax.typesetPromise([preview])
            .then(() => {
                paginateBook();
                checkOverflow();
            })
            .catch((error) => {
                console.error('MathJax typeset failed:', error);
                paginateBook();
                checkOverflow();
            });
        return;
    }

    paginateBook();
    checkOverflow();
}

function paginateBook() {
    let page = document.querySelector('.topic-page');
    let guard = 0;

    while (page && guard < 900) {
        guard += 1;

        const body = page.querySelector('.page-body');
        if (!body) {
            page = nextTopicPage(page);
            continue;
        }

        if (isVerticallyOverflowing(body)) {
            const moved = moveOverflowToContinuation(page);
            if (!moved) {
                protectTrailingOrphanHeading(page);
                page = nextTopicPage(page);
            }
            continue;
        }

        protectTrailingOrphanHeading(page);
        page = nextTopicPage(page);
    }

    updateRenderedPageNumbers();
}

function nextTopicPage(page) {
    let next = page.nextElementSibling;
    while (next && !next.classList.contains('topic-page')) {
        next = next.nextElementSibling;
    }
    return next;
}

function isVerticallyOverflowing(body) {
    return Math.ceil(body.scrollHeight) > Math.ceil(body.clientHeight) + 1;
}

function moveOverflowToContinuation(page) {
    const body = page.querySelector('.page-body');
    const nextPage = getOrCreateContinuationPage(page);
    const nextBody = nextPage.querySelector('.page-body');
    let moved = false;

    while (isVerticallyOverflowing(body)) {
        const block = getLastLogicalBlock(body);
        if (!block) {
            return moved;
        }

        const blockCount = elementChildren(body).length;

        if (blockCount > 1) {
            prependElement(nextBody, block);
            moved = true;
            continue;
        }

        if (canFitOnEmptyPage(block, body)) {
            return moved;
        }

        if (splitOversizedBlock(block, body, nextBody)) {
            moved = true;
            continue;
        }

        return moved;
    }

    protectTrailingOrphanHeading(page);
    return moved;
}

function getLastLogicalBlock(root) {
    const children = elementChildren(root);
    const prioritySelector = [
        'section.content-section',
        '.keep-together',
        '.exam-box',
        'table',
        'blockquote',
        'ul',
        'ol',
        'p'
    ].join(',');

    for (let index = children.length - 1; index >= 0; index -= 1) {
        const child = children[index];
        if (child.matches(prioritySelector) || child.nodeType === Node.ELEMENT_NODE) {
            return child;
        }
    }

    return null;
}

function splitOversizedBlock(block, overflowRoot, nextBody) {
    if (block.matches('table')) {
        return splitTable(block, overflowRoot, nextBody);
    }

    if (block.matches('ul, ol')) {
        return splitContainerChildren(block, overflowRoot, nextBody, block.cloneNode(false));
    }

    if (block.classList.contains('exam-box')) {
        return splitContainerChildren(block, overflowRoot, nextBody, block.cloneNode(false), '.idea-line');
    }

    if (block.classList.contains('content-section')) {
        return splitContentSection(block, overflowRoot, nextBody);
    }

    if (block.classList.contains('keep-together')) {
        return splitContainerChildren(block, overflowRoot, nextBody, block.cloneNode(false));
    }

    return splitContainerChildren(block, overflowRoot, nextBody, block.cloneNode(false));
}

function splitContentSection(section, overflowRoot, nextBody) {
    const continuation = section.cloneNode(false);
    prependElement(nextBody, continuation);
    let moved = false;

    while (isVerticallyOverflowing(overflowRoot)) {
        const children = elementChildren(section);

        if (!children.length) {
            section.remove();
            removeIfEmpty(continuation);
            return moved;
        }

        const last = children[children.length - 1];

        if (children.length <= 2 && startsWithHeading(section) && canSplitElement(last)) {
            const split = splitChildIntoContinuation(last, overflowRoot, continuation);
            moved = moved || split;
            if (!split) {
                prependElement(continuation, last);
                moved = true;
            }
        } else if (canSplitElement(last) && !canFitOnEmptyPage(last, overflowRoot)) {
            const split = splitChildIntoContinuation(last, overflowRoot, continuation);
            moved = moved || split;
            if (!split) {
                prependElement(continuation, last);
                moved = true;
            }
        } else {
            prependElement(continuation, last);
            moved = true;
        }

        if (hasOnlyHeading(section)) {
            moveAllChildren(section, continuation);
            section.remove();
            moved = true;
            break;
        }
    }

    removeIfEmpty(continuation);
    removeIfEmpty(section);
    return moved;
}

function splitChildIntoContinuation(child, overflowRoot, continuationParent) {
    if (child.matches('table')) {
        return splitTable(child, overflowRoot, continuationParent);
    }

    if (child.matches('ul, ol')) {
        return splitContainerChildren(child, overflowRoot, continuationParent, child.cloneNode(false));
    }

    if (child.classList.contains('exam-box')) {
        return splitContainerChildren(child, overflowRoot, continuationParent, child.cloneNode(false), '.idea-line');
    }

    if (child.classList.contains('keep-together') || child.classList.contains('content-section')) {
        return splitContainerChildren(child, overflowRoot, continuationParent, child.cloneNode(false));
    }

    return false;
}

function splitContainerChildren(source, overflowRoot, targetParent, continuation, preferredChildSelector = '') {
    prependElement(targetParent, continuation);
    let moved = false;

    while (isVerticallyOverflowing(overflowRoot)) {
        let candidates = preferredChildSelector
            ? Array.from(source.children).filter((child) => child.matches(preferredChildSelector))
            : elementChildren(source);

        if (!candidates.length && preferredChildSelector) {
            candidates = elementChildren(source);
        }

        if (!candidates.length) {
            removeIfEmpty(continuation);
            return moved;
        }

        const candidate = candidates[candidates.length - 1];
        prependElement(continuation, candidate);
        moved = true;

        if (!elementChildren(source).length) {
            source.remove();
            break;
        }
    }

    removeIfEmpty(continuation);
    removeIfEmpty(source);
    return moved;
}

function splitTable(table, overflowRoot, targetParent) {
    const tbody = table.tBodies[0];
    if (!tbody || tbody.rows.length < 2) {
        return false;
    }

    const continuation = table.cloneNode(false);
    const thead = table.tHead ? table.tHead.cloneNode(true) : null;
    const continuationBody = document.createElement('tbody');

    if (thead) {
        continuation.appendChild(thead);
    }
    continuation.appendChild(continuationBody);
    prependElement(targetParent, continuation);

    let moved = false;
    while (isVerticallyOverflowing(overflowRoot) && tbody.rows.length > 1) {
        continuationBody.insertBefore(tbody.rows[tbody.rows.length - 1], continuationBody.firstChild);
        moved = true;
    }

    if (!continuationBody.rows.length) {
        continuation.remove();
    }
    return moved;
}

function protectTrailingOrphanHeading(page) {
    const body = page.querySelector('.page-body');
    if (!body) {
        return false;
    }

    const last = lastElementChild(body);
    if (!last) {
        return false;
    }

    const shouldMove =
        isHeadingElement(last) ||
        (last.classList.contains('content-section') && hasOnlyHeading(last));

    if (!shouldMove) {
        return false;
    }

    const nextPage = getExistingContinuationPage(page);
    if (!nextPage) {
        return false;
    }

    const nextBody = nextPage.querySelector('.page-body');
    prependElement(nextBody, last);
    return true;
}

function getExistingContinuationPage(page) {
    const sourceIndex = page.dataset.sourceIndex;
    const next = page.nextElementSibling;

    if (
        next &&
        next.classList.contains('topic-page') &&
        next.dataset.sourceIndex === sourceIndex &&
        next.dataset.generated === 'true'
    ) {
        return next;
    }

    return null;
}

function getOrCreateContinuationPage(page) {
    const sourceIndex = page.dataset.sourceIndex;
    const next = page.nextElementSibling;

    if (
        next &&
        next.classList.contains('topic-page') &&
        next.dataset.sourceIndex === sourceIndex &&
        next.dataset.generated === 'true'
    ) {
        return next;
    }

    const continuation = document.createElement('article');
    continuation.className = 'a4-page topic-page';
    continuation.dataset.sourceIndex = sourceIndex;
    continuation.dataset.topic = page.dataset.topic || '';
    continuation.dataset.chapter = page.dataset.chapter || '';
    continuation.dataset.generated = 'true';

    const header = document.createElement('header');
    header.className = 'page-header';

    const topic = document.createElement('div');
    topic.className = 'header-topic';
    topic.textContent = `${continuation.dataset.topic || 'موضوع بدون عنوان'} - ${continuation.dataset.chapter || 'اسم الفصل'}`;

    const count = document.createElement('div');
    count.className = 'header-count';
    count.textContent = 'صفحة';

    const body = document.createElement('section');
    body.className = 'page-body';

    header.append(topic, count);
    continuation.append(header, body);
    page.after(continuation);

    return continuation;
}

function updateRenderedPageNumbers() {
    const pages = Array.from(document.querySelectorAll('.topic-page'));
    const total = pages.length;

    pages.forEach((page, index) => {
        const count = page.querySelector('.header-count');
        if (count) {
            count.textContent = `صفحة ${index + 1} / ${total}`;
        }
    });
}

function checkOverflow() {
    const bodies = document.querySelectorAll('.page-body');

    bodies.forEach((body) => {
        const page = body.closest('.a4-page');
        if (!page) {
            return;
        }

        page.classList.remove('has-overflow');
        if (body.scrollHeight > body.clientHeight + 1 || body.scrollWidth > body.clientWidth + 1) {
            page.classList.add('has-overflow');
        }
    });
}

function isHeadingElement(element) {
    return element && /^H[1-3]$/i.test(element.tagName);
}

function elementChildren(root) {
    return Array.from(root.children);
}

function lastElementChild(root) {
    return elementChildren(root).at(-1) || null;
}

function prependElement(parent, element) {
    parent.insertBefore(element, parent.firstElementChild || parent.firstChild);
}

function moveAllChildren(source, target) {
    while (source.lastChild) {
        target.insertBefore(source.lastChild, target.firstChild);
    }
}

function removeIfEmpty(element) {
    if (element && !element.children.length && !element.textContent.trim()) {
        element.remove();
    }
}

function startsWithHeading(element) {
    const first = elementChildren(element)[0];
    return isHeadingElement(first);
}

function hasOnlyHeading(element) {
    const children = elementChildren(element);
    return children.length > 0 && children.every(isHeadingElement);
}

function canSplitElement(element) {
    return element && (
        element.classList.contains('content-section') ||
        element.classList.contains('keep-together') ||
        element.classList.contains('exam-box') ||
        element.matches('table, ul, ol')
    );
}

function canFitOnEmptyPage(element, body) {
    const style = window.getComputedStyle(element);
    const marginTop = Number.parseFloat(style.marginTop) || 0;
    const marginBottom = Number.parseFloat(style.marginBottom) || 0;
    return element.getBoundingClientRect().height + marginTop + marginBottom <= body.clientHeight + 1;
}
