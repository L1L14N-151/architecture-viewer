let folderStructure = null;
let rootFolderName = '';
let history = JSON.parse(localStorage.getItem('folderHistory') || '[]');

const dropZone = document.getElementById('dropZone');
const folderInput = document.getElementById('folderInput');
const treeContainer = document.getElementById('treeContainer');
const tree = document.getElementById('tree');
const controls = document.getElementById('controls');
const stats = document.getElementById('stats');
const folderNameElement = document.getElementById('folderName');
const excludeInput = document.getElementById('excludeInput');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const historyModal = document.getElementById('historyModal');
const historyList = document.getElementById('historyList');
const statsToggle = document.getElementById('statsToggle');
const statsContent = document.getElementById('statsContent');
const themeBtn = document.getElementById('themeBtn');
const themeDropdown = document.getElementById('themeDropdown');
const langBtn = document.getElementById('langBtn');
const langDropdown = document.getElementById('langDropdown');
const currentLangSpan = document.getElementById('currentLang');

let languageChart = null;
let currentTheme = localStorage.getItem('selectedTheme') || 'dark';
let currentLanguage = localStorage.getItem('selectedLanguage') || 'fr';

// Traductions
const translations = {
    fr: {
        title: "Visualiseur d'Architecture",
        subtitle: "Glissez-déposez un dossier ou cliquez pour sélectionner",
        dropText: "Glissez un dossier ici",
        or: "ou",
        selectFolder: "Sélectionner un dossier",
        exclusions: "Exclusions",
        filterHint: "Séparez par des virgules (ex: node_modules, .git, *.log)",
        presetDefault: "Par défaut",
        presetMinimal: "Minimal",
        presetNone: "Aucun",
        presetMedia: "Sans médias",
        presetDev: "Dev complet",
        folderStructure: "Structure du dossier",
        searchPlaceholder: "Rechercher un fichier ou dossier...",
        copy: "Copier",
        export: "Exporter",
        clear: "Effacer",
        advancedStats: "Statistiques avancées",
        languageDistribution: "Répartition par langage",
        topFiles: "Top 5 fichiers",
        details: "Détails",
        analysisHistory: "Historique des analyses",
        clearHistory: "Vider l'historique",
        history: "Historique",
        files: "fichiers",
        folders: "dossiers",
        lines: "lignes",
        copied: "Copié!",
        noHistory: "Aucun historique",
        totalLines: "Total de lignes",
        detectedLanguages: "Langages détectés",
        avgLinesPerFile: "Moyenne lignes/fichier",
        mainLanguage: "Langage principal",
        noFile: "Aucun fichier trouvé"
    },
    en: {
        title: "Folder Architecture Viewer",
        subtitle: "Drag and drop a folder or click to select",
        dropText: "Drop a folder here",
        or: "or",
        selectFolder: "Select a folder",
        exclusions: "Exclusions",
        filterHint: "Separate with commas (e.g., node_modules, .git, *.log)",
        presetDefault: "Default",
        presetMinimal: "Minimal",
        presetNone: "None",
        presetMedia: "No media",
        presetDev: "Full dev",
        folderStructure: "Folder structure",
        searchPlaceholder: "Search for a file or folder...",
        copy: "Copy",
        export: "Export",
        clear: "Clear",
        advancedStats: "Advanced statistics",
        languageDistribution: "Language distribution",
        topFiles: "Top 5 files",
        details: "Details",
        analysisHistory: "Analysis history",
        clearHistory: "Clear history",
        history: "History",
        files: "files",
        folders: "folders",
        lines: "lines",
        copied: "Copied!",
        noHistory: "No history",
        totalLines: "Total lines",
        detectedLanguages: "Detected languages",
        avgLinesPerFile: "Average lines/file",
        mainLanguage: "Main language",
        noFile: "No file found"
    }
};

const presets = {
    default: 'node_modules, .git, .vscode, .idea, dist, build, .DS_Store',
    minimal: '.git, .DS_Store',
    none: '',
    media: '*.jpg, *.jpeg, *.png, *.gif, *.mp4, *.mp3, *.wav, *.mov, *.avi',
    dev: 'node_modules, .git, .vscode, .idea, dist, build, coverage, .cache, .parcel-cache, .next, .nuxt, .DS_Store, *.log, package-lock.json, yarn.lock, pnpm-lock.yaml'
};

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    const items = e.dataTransfer.items;
    if (items) {
        const item = items[0];
        if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry();
            if (entry && entry.isDirectory) {
                rootFolderName = entry.name;
                processDirectory(entry);
            } else {
                alert('Veuillez sélectionner un dossier, pas un fichier.');
            }
        }
    }
});

folderInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
        const pathParts = files[0].webkitRelativePath.split('/');
        rootFolderName = pathParts[0];
        processFiles(files);
    }
});

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const preset = btn.getAttribute('data-preset');
        excludeInput.value = presets[preset];
        if (folderStructure) {
            displayStructure();
        }
    });
});

excludeInput.addEventListener('input', () => {
    if (folderStructure) {
        displayStructure();
    }
});

function shouldExclude(path) {
    const excludePatterns = excludeInput.value
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);
    
    if (excludePatterns.length === 0) return false;
    
    const pathParts = path.split('/');
    const fileName = pathParts[pathParts.length - 1];
    
    for (const pattern of excludePatterns) {
        if (pattern.startsWith('*')) {
            const extension = pattern.substring(1);
            if (fileName.endsWith(extension)) {
                return true;
            }
        } else if (pattern.endsWith('*')) {
            const prefix = pattern.substring(0, pattern.length - 1);
            if (fileName.startsWith(prefix)) {
                return true;
            }
        } else {
            for (const part of pathParts) {
                if (part === pattern) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

function processFiles(files) {
    const structure = {
        name: rootFolderName,
        type: 'folder',
        children: {}
    };
    
    files.forEach(file => {
        const relativePath = file.webkitRelativePath;
        
        if (shouldExclude(relativePath)) {
            return;
        }
        
        const pathParts = relativePath.split('/');
        let current = structure;
        
        for (let i = 1; i < pathParts.length; i++) {
            const part = pathParts[i];
            
            if (i === pathParts.length - 1) {
                if (!current.children) current.children = {};
                current.children[part] = {
                    name: part,
                    type: 'file',
                    size: file.size,
                    path: relativePath
                };
            } else {
                if (!current.children) current.children = {};
                if (!current.children[part]) {
                    current.children[part] = {
                        name: part,
                        type: 'folder',
                        children: {},
                        path: pathParts.slice(0, i + 1).join('/')
                    };
                }
                current = current.children[part];
            }
        }
    });
    
    folderStructure = structure;
    displayStructure();
}

async function processDirectory(entry) {
    async function readDirectory(dirEntry, path = '') {
        const entries = await new Promise((resolve, reject) => {
            const reader = dirEntry.createReader();
            const entries = [];
            
            function readEntries() {
                reader.readEntries((results) => {
                    if (results.length) {
                        entries.push(...results);
                        readEntries();
                    } else {
                        resolve(entries);
                    }
                }, reject);
            }
            
            readEntries();
        });
        
        const structure = {
            name: dirEntry.name,
            type: 'folder',
            children: {},
            path: path
        };
        
        for (const entry of entries) {
            const entryPath = path ? `${path}/${entry.name}` : entry.name;
            
            if (shouldExclude(entryPath)) {
                continue;
            }
            
            if (entry.isFile) {
                const file = await new Promise((resolve, reject) => {
                    entry.file(resolve, reject);
                });
                structure.children[entry.name] = {
                    name: entry.name,
                    type: 'file',
                    size: file.size,
                    path: entryPath
                };
            } else if (entry.isDirectory) {
                structure.children[entry.name] = await readDirectory(entry, entryPath);
            }
        }
        
        return structure;
    }
    
    try {
        folderStructure = await readDirectory(entry);
        displayStructure();
    } catch (error) {
        console.error('Erreur lors de la lecture du dossier:', error);
        alert('Erreur lors de la lecture du dossier.');
    }
}

function displayStructure() {
    if (!folderStructure) return;
    
    folderNameElement.innerHTML = `<i class="fas fa-folder-open"></i> ${folderStructure.name}`;
    
    const filteredStructure = filterStructure(folderStructure);
    const fileCount = countFiles(filteredStructure);
    const folderCount = countFolders(filteredStructure) - 1;
    const totalSize = calculateSize(filteredStructure);
    
    const textTree = generateTextTree(filteredStructure, '', true);
    const treeLineCount = textTree.split('\n').filter(line => line.trim()).length;
    
    const t = translations[currentLanguage];
    stats.innerHTML = `
        <span><i class="fas fa-folder"></i> ${folderCount} ${t.folders}</span> • 
        <span><i class="fas fa-file"></i> ${fileCount} ${t.files}</span> • 
        <span><i class="fas fa-hdd"></i> ${formatSize(totalSize)}</span> • 
        <span><i class="fas fa-list"></i> ${treeLineCount} ${t.lines}</span>
    `;
    
    tree.textContent = textTree;
    
    treeContainer.style.display = 'block';
    
    // Calculer et afficher les statistiques avancées
    calculateAdvancedStats(filteredStructure);
    
    // Ajouter à l'historique
    addToHistory({
        name: folderStructure.name,
        fileCount,
        folderCount,
        totalSize,
        date: new Date().toISOString(),
        structure: folderStructure
    });
}

function addToHistory(item) {
    // Vérifier si le dossier existe déjà dans l'historique
    const existingIndex = history.findIndex(h => h.name === item.name);
    if (existingIndex !== -1) {
        history.splice(existingIndex, 1);
    }
    
    // Ajouter en début de liste
    history.unshift(item);
    
    // Limiter à 10 éléments
    if (history.length > 10) {
        history = history.slice(0, 10);
    }
    
    // Sauvegarder dans localStorage
    localStorage.setItem('folderHistory', JSON.stringify(history));
}

function filterStructure(node) {
    if (node.type === 'file') {
        return node;
    }
    
    const filtered = {
        name: node.name,
        type: 'folder',
        children: {}
    };
    
    if (node.children) {
        Object.entries(node.children).forEach(([key, child]) => {
            if (child.path && shouldExclude(child.path)) {
                return;
            }
            if (!child.path && shouldExclude(child.name)) {
                return;
            }
            filtered.children[key] = filterStructure(child);
        });
    }
    
    return filtered;
}


function countFiles(node) {
    if (node.type === 'file') return 1;
    if (!node.children) return 0;
    
    return Object.values(node.children).reduce((sum, child) => {
        return sum + countFiles(child);
    }, 0);
}

function countFolders(node) {
    if (node.type === 'file') return 0;
    
    let count = 1;
    if (node.children) {
        count += Object.values(node.children).reduce((sum, child) => {
            return sum + countFolders(child);
        }, 0);
    }
    
    return count;
}

function calculateSize(node) {
    if (node.type === 'file') return node.size || 0;
    if (!node.children) return 0;
    
    return Object.values(node.children).reduce((sum, child) => {
        return sum + calculateSize(child);
    }, 0);
}

function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}


document.getElementById('copyBtn').addEventListener('click', () => {
    const text = tree.textContent;
    navigator.clipboard.writeText(text).then(() => {
        const btn = document.getElementById('copyBtn');
        const originalText = btn.innerHTML;
        const t = translations[currentLanguage];
        btn.innerHTML = `<i class="fas fa-check"></i> ${t.copied}`;
        setTimeout(() => {
            btn.innerHTML = originalText;
        }, 2000);
    }).catch(err => {
        console.error('Erreur lors de la copie:', err);
        alert('Erreur lors de la copie dans le presse-papier');
    });
});

document.getElementById('clearBtn').addEventListener('click', () => {
    folderStructure = null;
    treeContainer.style.display = 'none';
    folderInput.value = '';
});

// Export dropdown
const exportBtn = document.getElementById('exportBtn');
const exportMenu = document.getElementById('exportMenu');

exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportMenu.classList.toggle('show');
});

document.addEventListener('click', () => {
    exportMenu.classList.remove('show');
});

document.querySelectorAll('.export-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const format = btn.getAttribute('data-format');
        exportStructure(format);
        exportMenu.classList.remove('show');
    });
});

function exportStructure(format) {
    if (!folderStructure) return;
    
    const filteredStructure = filterStructure(folderStructure);
    let content, filename, mimeType;
    
    switch(format) {
        case 'txt':
            content = generateTextTree(filteredStructure, '', true);
            filename = `${rootFolderName}_structure.txt`;
            mimeType = 'text/plain';
            break;
            
        case 'json':
            content = JSON.stringify(filteredStructure, null, 2);
            filename = `${rootFolderName}_structure.json`;
            mimeType = 'application/json';
            break;
            
        case 'md':
            content = generateMarkdownTree(filteredStructure);
            filename = `${rootFolderName}_structure.md`;
            mimeType = 'text/markdown';
            break;
            
        case 'csv':
            content = generateCSV(filteredStructure);
            filename = `${rootFolderName}_structure.csv`;
            mimeType = 'text/csv';
            break;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function generateMarkdownTree(node, level = 0) {
    let result = '';
    const indent = '  '.repeat(level);
    
    if (level === 0) {
        result += `# 📁 ${node.name}\n\n`;
        result += `## Structure\n\n`;
    } else {
        const prefix = node.type === 'folder' ? '📁' : '📄';
        result += `${indent}- ${prefix} **${node.name}**`;
        if (node.type === 'file' && node.size !== undefined) {
            result += ` *(${formatSize(node.size)})*`;
        }
        result += '\n';
    }
    
    if (node.children) {
        const sortedChildren = Object.values(node.children).sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
        
        sortedChildren.forEach(child => {
            result += generateMarkdownTree(child, level + 1);
        });
    }
    
    if (level === 0) {
        const fileCount = countFiles(node);
        const folderCount = countFolders(node) - 1;
        const totalSize = calculateSize(node);
        
        result += `\n## Statistiques\n\n`;
        result += `- 📁 **Dossiers:** ${folderCount}\n`;
        result += `- 📄 **Fichiers:** ${fileCount}\n`;
        result += `- 💾 **Taille totale:** ${formatSize(totalSize)}\n`;
    }
    
    return result;
}

function generateCSV(node) {
    let result = 'Type,Nom,Chemin,Taille\n';
    
    function traverse(node, path = '') {
        const currentPath = path ? `${path}/${node.name}` : node.name;
        
        if (node.type === 'file') {
            result += `Fichier,"${node.name}","${currentPath}",${node.size || 0}\n`;
        } else {
            result += `Dossier,"${node.name}","${currentPath}",0\n`;
            
            if (node.children) {
                Object.values(node.children).forEach(child => {
                    traverse(child, currentPath);
                });
            }
        }
    }
    
    traverse(node);
    return result;
}

// Toggle stats section
statsToggle.addEventListener('click', () => {
    const isVisible = statsContent.style.display !== 'none';
    statsContent.style.display = isVisible ? 'none' : 'block';
    statsToggle.classList.toggle('active', !isVisible);
});

// Calculer les statistiques avancées
function calculateAdvancedStats(structure) {
    const languageStats = {};
    const fileList = [];
    let totalLines = 0;
    
    // Fonction pour vérifier si c'est un fichier de code
    function isCodeFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const mediaExtensions = [
            'png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg', 'ico', 'webp', 'tiff',
            'mp4', 'avi', 'mov', 'wmv', 'flv', 'webm', 'mkv', 'mpg', 'mpeg',
            'mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a',
            'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
            'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
            'exe', 'dmg', 'pkg', 'deb', 'rpm',
            'ttf', 'otf', 'woff', 'woff2', 'eot',
            'db', 'sqlite', 'lock'
        ];
        return !mediaExtensions.includes(ext);
    }
    
    // Fonction pour obtenir le langage d'un fichier
    function getLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const languageMap = {
            'js': 'JavaScript',
            'jsx': 'React',
            'ts': 'TypeScript',
            'tsx': 'React TS',
            'html': 'HTML',
            'css': 'CSS',
            'scss': 'SCSS',
            'sass': 'Sass',
            'less': 'Less',
            'json': 'JSON',
            'xml': 'XML',
            'py': 'Python',
            'java': 'Java',
            'c': 'C',
            'cpp': 'C++',
            'cs': 'C#',
            'php': 'PHP',
            'rb': 'Ruby',
            'go': 'Go',
            'rs': 'Rust',
            'swift': 'Swift',
            'kt': 'Kotlin',
            'md': 'Markdown',
            'txt': 'Text',
            'yaml': 'YAML',
            'yml': 'YAML',
            'sh': 'Shell',
            'bash': 'Bash',
            'sql': 'SQL',
            'vue': 'Vue',
            'svelte': 'Svelte',
            'r': 'R',
            'lua': 'Lua',
            'dart': 'Dart',
            'scala': 'Scala',
            'h': 'C Header',
            'hpp': 'C++ Header',
            'asm': 'Assembly',
            'pl': 'Perl',
            'ex': 'Elixir',
            'exs': 'Elixir',
            'elm': 'Elm',
            'clj': 'Clojure',
            'coffee': 'CoffeeScript',
            'gradle': 'Gradle',
            'groovy': 'Groovy',
            'cfg': 'Config',
            'ini': 'INI',
            'toml': 'TOML',
            'env': 'Environment'
        };
        return languageMap[ext] || 'Autre';
    }
    
    // Fonction pour estimer les lignes de code
    function estimateLines(size, filename) {
        const language = getLanguage(filename);
        // Estimation basée sur le type de fichier
        const bytesPerLine = {
            'JavaScript': 35,
            'React': 35,
            'TypeScript': 40,
            'React TS': 40,
            'HTML': 50,
            'CSS': 30,
            'SCSS': 30,
            'Python': 35,
            'Java': 45,
            'JSON': 40,
            'Markdown': 60,
            'Text': 50
        };
        const bpl = bytesPerLine[language] || 40;
        return Math.round(size / bpl);
    }
    
    // Parcourir la structure
    function traverse(node) {
        if (node.type === 'file' && node.size && isCodeFile(node.name)) {
            const language = getLanguage(node.name);
            const lines = estimateLines(node.size, node.name);
            
            if (!languageStats[language]) {
                languageStats[language] = { lines: 0, files: 0, size: 0 };
            }
            
            languageStats[language].lines += lines;
            languageStats[language].files += 1;
            languageStats[language].size += node.size;
            totalLines += lines;
            
            fileList.push({
                name: node.name,
                size: node.size,
                lines: lines,
                language: language
            });
        }
        
        if (node.children) {
            Object.values(node.children).forEach(child => traverse(child));
        }
    }
    
    traverse(structure);
    
    // Trier les fichiers par taille
    fileList.sort((a, b) => b.size - a.size);
    
    // Mettre à jour le graphique
    updateLanguageChart(languageStats);
    
    // Afficher le top 5 des fichiers
    displayTopFiles(fileList.slice(0, 5));
    
    // Afficher les détails
    displayDetails(languageStats, totalLines, fileList.length);
}

// Mettre à jour le graphique camembert
function updateLanguageChart(languageStats) {
    const ctx = document.getElementById('languageChart').getContext('2d');
    
    // Détruire le graphique existant s'il y en a un
    if (languageChart) {
        languageChart.destroy();
    }
    
    // Préparer les données
    const sortedLanguages = Object.entries(languageStats)
        .sort((a, b) => b[1].lines - a[1].lines)
        .slice(0, 8); // Top 8 langages
    
    // Si aucun fichier de code trouvé
    if (sortedLanguages.length === 0) {
        // Afficher un message au lieu du graphique
        const canvas = document.getElementById('languageChart');
        canvas.style.display = 'none';
        if (!document.getElementById('noCodeMessage')) {
            const message = document.createElement('div');
            message.id = 'noCodeMessage';
            message.style.textAlign = 'center';
            message.style.color = '#808080';
            message.style.padding = '40px';
            message.innerHTML = '<i class="fas fa-code"></i> Aucun fichier de code détecté';
            canvas.parentNode.appendChild(message);
        }
        return;
    } else {
        // Réafficher le canvas si nécessaire
        const canvas = document.getElementById('languageChart');
        canvas.style.display = 'block';
        const message = document.getElementById('noCodeMessage');
        if (message) message.remove();
    }
    
    const labels = sortedLanguages.map(([lang, _]) => lang);
    const data = sortedLanguages.map(([_, stats]) => stats.lines);
    
    // Couleurs pour chaque langage
    const colors = [
        '#3b82f6', // Bleu
        '#10b981', // Vert
        '#f59e0b', // Orange
        '#ef4444', // Rouge
        '#8b5cf6', // Violet
        '#ec4899', // Rose
        '#14b8a6', // Turquoise
        '#f97316'  // Orange foncé
    ];
    
    languageChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderColor: '#1a1a1a',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#e0e0e0',
                        padding: 10,
                        font: {
                            size: 11
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.raw || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return `${label}: ${value.toLocaleString()} lignes (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// Afficher le top 5 des fichiers
function displayTopFiles(files) {
    const container = document.getElementById('topFiles');
    
    if (files.length === 0) {
        const t = translations[currentLanguage];
        container.innerHTML = `<div class="detail-item"><span class="detail-label">${t.noFile}</span></div>`;
        return;
    }
    
    container.innerHTML = files.map((file, index) => `
        <div class="top-file-item">
            <span class="file-name">${index + 1}. ${file.name}</span>
            <span class="file-size">${formatSize(file.size)}</span>
        </div>
    `).join('');
}

// Afficher les détails
function displayDetails(languageStats, totalLines, totalFiles) {
    const container = document.getElementById('detailsStats');
    
    const uniqueLanguages = Object.keys(languageStats).length;
    const avgLinesPerFile = totalFiles > 0 ? Math.round(totalLines / totalFiles) : 0;
    
    // Langage dominant
    const dominantLang = Object.entries(languageStats)
        .sort((a, b) => b[1].lines - a[1].lines)[0];
    
    const t = translations[currentLanguage];
    container.innerHTML = `
        <div class="detail-item">
            <span class="detail-label">${t.totalLines}</span>
            <span class="detail-value">${totalLines.toLocaleString()}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">${t.detectedLanguages}</span>
            <span class="detail-value">${uniqueLanguages}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">${t.avgLinesPerFile}</span>
            <span class="detail-value">${avgLinesPerFile}</span>
        </div>
        <div class="detail-item">
            <span class="detail-label">${t.mainLanguage}</span>
            <span class="detail-value">${dominantLang ? dominantLang[0] : 'N/A'}</span>
        </div>
    `;
}

// Initialisation du thème
document.addEventListener('DOMContentLoaded', () => {
    // Appliquer le thème sauvegardé
    document.body.setAttribute('data-theme', currentTheme);
    updateActiveTheme();
    
    // Toggle dropdown thème
    themeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        themeDropdown.classList.toggle('show');
    });
    
    // Fermer le dropdown si on clique ailleurs
    document.addEventListener('click', () => {
        themeDropdown.classList.remove('show');
    });
    
    // Sélection d'un thème
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const theme = btn.getAttribute('data-theme');
            applyTheme(theme);
            themeDropdown.classList.remove('show');
        });
    });
});

// Appliquer un thème
function applyTheme(theme) {
    currentTheme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('selectedTheme', theme);
    updateActiveTheme();
    
    // Mettre à jour le graphique si nécessaire
    if (languageChart) {
        updateChartColors();
    }
}

// Mettre à jour l'indicateur du thème actif
function updateActiveTheme() {
    document.querySelectorAll('.theme-option').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-theme') === currentTheme);
    });
}

// Mettre à jour les couleurs du graphique selon le thème
function updateChartColors() {
    if (!languageChart) return;
    
    // Obtenir la couleur du texte actuel pour la légende
    const textColor = getComputedStyle(document.body).getPropertyValue('--text');
    
    languageChart.options.plugins.legend.labels.color = textColor;
    languageChart.update();
}

// Recherche avec navigation
let searchMatches = [];
let currentMatchIndex = 0;
let searchTimeout = null;

const prevBtn = document.getElementById('prevResult');
const nextBtn = document.getElementById('nextResult');

searchInput.addEventListener('input', (e) => {
    // Annuler la recherche précédente si elle est en cours
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    const searchTerm = e.target.value.toLowerCase().trim();
    
    if (!searchTerm) {
        resetSearch();
        return;
    }
    
    // Démarrer la recherche après un court délai (debounce)
    searchTimeout = setTimeout(() => performSearch(searchTerm), 150);
});

function performSearch(searchTerm) {
    const lines = tree.textContent.split('\n');
    searchMatches = [];
    let highlightedText = '';
    let lineIndex = 0;
    
    // Traiter les lignes par batch pour ne pas bloquer l'UI
    const batchSize = 100;
    let currentBatch = 0;
    
    function processBatch() {
        const endIndex = Math.min(currentBatch + batchSize, lines.length);
        
        for (let i = currentBatch; i < endIndex; i++) {
            const line = lines[i];
            if (line.toLowerCase().includes(searchTerm)) {
                searchMatches.push(lineIndex);
                // Surligner le terme recherché
                const regex = new RegExp(`(${escapeRegex(searchTerm)})`, 'gi');
                highlightedText += line.replace(regex, '<span class="highlight" data-match-line="' + lineIndex + '">$1</span>') + '\n';
            } else {
                highlightedText += line + '\n';
            }
            lineIndex++;
        }
        
        currentBatch = endIndex;
        
        // Si on a traité toutes les lignes
        if (currentBatch >= lines.length) {
            tree.innerHTML = highlightedText;
            updateSearchUI();
            if (searchMatches.length > 0) {
                highlightCurrentMatch();
                scrollToCurrentMatch();
            }
        } else {
            // Continuer avec le prochain batch
            requestAnimationFrame(processBatch);
        }
    }
    
    processBatch();
}

function resetSearch() {
    tree.innerHTML = tree.textContent;
    searchResults.textContent = '';
    searchMatches = [];
    currentMatchIndex = 0;
    prevBtn.style.display = 'none';
    nextBtn.style.display = 'none';
}

function updateSearchUI() {
    const matchCount = searchMatches.length;
    
    if (matchCount > 0) {
        searchResults.textContent = `${currentMatchIndex + 1}/${matchCount}`;
        prevBtn.style.display = 'inline-block';
        nextBtn.style.display = 'inline-block';
        prevBtn.disabled = currentMatchIndex === 0;
        nextBtn.disabled = currentMatchIndex === matchCount - 1;
    } else {
        searchResults.textContent = 'Aucun résultat';
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
}

function highlightCurrentMatch() {
    // Retirer la classe current de tous les éléments
    document.querySelectorAll('.highlight.current').forEach(el => {
        el.classList.remove('current');
    });
    
    // Ajouter la classe current au match actuel
    const currentLine = searchMatches[currentMatchIndex];
    const highlights = document.querySelectorAll(`.highlight[data-match-line="${currentLine}"]`);
    highlights.forEach(el => el.classList.add('current'));
}

function scrollToCurrentMatch() {
    const currentLine = searchMatches[currentMatchIndex];
    const highlights = document.querySelectorAll(`.highlight[data-match-line="${currentLine}"]`);
    if (highlights.length > 0) {
        highlights[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

prevBtn.addEventListener('click', () => {
    if (currentMatchIndex > 0) {
        currentMatchIndex--;
        highlightCurrentMatch();
        scrollToCurrentMatch();
        updateSearchUI();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentMatchIndex < searchMatches.length - 1) {
        currentMatchIndex++;
        highlightCurrentMatch();
        scrollToCurrentMatch();
        updateSearchUI();
    }
});

// Fonction pour échapper les caractères spéciaux dans regex
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Historique
document.getElementById('historyBtn').addEventListener('click', () => {
    showHistory();
});

document.getElementById('closeHistory').addEventListener('click', () => {
    historyModal.style.display = 'none';
});

document.getElementById('clearHistory').addEventListener('click', () => {
    history = [];
    localStorage.removeItem('folderHistory');
    showHistory();
});

historyModal.addEventListener('click', (e) => {
    if (e.target === historyModal) {
        historyModal.style.display = 'none';
    }
});

function deleteHistoryItem(index) {
    history.splice(index, 1);
    localStorage.setItem('folderHistory', JSON.stringify(history));
    showHistory();
}

function showHistory() {
    historyModal.style.display = 'flex';
    
    if (history.length === 0) {
        const t = translations[currentLanguage];
        historyList.innerHTML = `<div class="empty-history">${t.noHistory}</div>`;
        return;
    }
    
    historyList.innerHTML = history.map((item, index) => {
        const date = new Date(item.date);
        const locale = currentLanguage === 'fr' ? 'fr-FR' : 'en-US';
        const dateStr = date.toLocaleDateString(locale) + ' ' + date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="history-item" data-index="${index}">
                <button class="delete-history-item" data-index="${index}" title="Supprimer">
                    <i class="fas fa-times"></i>
                </button>
                <div class="history-item-content">
                    <div class="history-item-name"><i class="fas fa-folder"></i> ${item.name}</div>
                    <div class="history-item-info">
                        <span><i class="fas fa-file"></i> ${item.fileCount} ${translations[currentLanguage].files}</span>
                        <span><i class="fas fa-folder"></i> ${item.folderCount} ${translations[currentLanguage].folders}</span>
                        <span><i class="fas fa-hdd"></i> ${formatSize(item.totalSize)}</span>
                        <span><i class="fas fa-clock"></i> ${dateStr}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
    
    // Ajouter les événements de clic sur chaque élément
    document.querySelectorAll('.history-item-content').forEach(item => {
        item.addEventListener('click', () => {
            const historyItemDiv = item.closest('.history-item');
            const index = parseInt(historyItemDiv.getAttribute('data-index'));
            const historyItem = history[index];
            folderStructure = historyItem.structure;
            rootFolderName = historyItem.name;
            displayStructure();
            historyModal.style.display = 'none';
        });
    });
    
    // Ajouter les événements de suppression
    document.querySelectorAll('.delete-history-item').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(btn.getAttribute('data-index'));
            deleteHistoryItem(index);
        });
    });
}

function generateTextTree(node, prefix = '', isLast = true) {
    let result = '';
    const connector = isLast ? '└── ' : '├── ';
    const extension = isLast ? '    ' : '│   ';
    
    result += prefix + connector + node.name;
    if (node.type === 'file' && node.size !== undefined) {
        result += ` (${formatSize(node.size)})`;
    }
    result += '\n';
    
    if (node.children) {
        const children = Object.values(node.children);
        const sortedChildren = children.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
        
        sortedChildren.forEach((child, index) => {
            const isLastChild = index === sortedChildren.length - 1;
            result += generateTextTree(child, prefix + extension, isLastChild);
        });
    }
    
    return result;
}

// Système de traduction
function applyTranslations() {
    const t = translations[currentLanguage];
    
    // Traduire les éléments avec data-i18n
    document.querySelectorAll('[data-i18n]').forEach(elem => {
        const key = elem.getAttribute('data-i18n');
        if (t[key]) {
            elem.textContent = t[key];
        }
    });
    
    // Traduire les placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
        const key = elem.getAttribute('data-i18n-placeholder');
        if (t[key]) {
            elem.placeholder = t[key];
        }
    });
    
    // Mettre à jour le bouton de langue
    currentLangSpan.textContent = currentLanguage.toUpperCase();
    
    // Mettre à jour les stats si elles sont affichées
    if (treeContainer.style.display !== 'none') {
        updateStats();
    }
}

// Gestion du changement de langue
langBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    langDropdown.classList.toggle('show');
});

document.addEventListener('click', () => {
    langDropdown.classList.remove('show');
});

document.querySelectorAll('.lang-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const lang = btn.getAttribute('data-lang');
        currentLanguage = lang;
        localStorage.setItem('selectedLanguage', lang);
        applyTranslations();
        langDropdown.classList.remove('show');
        updateActiveLang();
    });
});

function updateActiveLang() {
    document.querySelectorAll('.lang-option').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-lang') === currentLanguage);
    });
}

// Initialisation de la langue au chargement
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    updateActiveLang();
});