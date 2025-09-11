# 📁 Folder Architecture Viewer

A modern web application to visualize and explore folder structures with an intuitive interface. Simply drag and drop a folder to generate its architecture tree.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Drag & Drop**: Simply drag your folder or click to select
- **Smart Filtering**: Exclude unwanted files/folders with presets or custom patterns
- **Multiple Export Formats**: TXT, JSON, Markdown, CSV
- **Search**: Find files and folders quickly with real-time search
- **History**: Keep track of your last 10 analyzed folders
- **Advanced Statistics**: View language distribution, top files, and detailed metrics
- **Themes**: 6 beautiful themes (Dark, Light, Ocean, Forest, Sunset, Cyberpunk)
- **Multilingual**: Available in French and English
- **Copy to Clipboard**: One-click copy of the entire tree structure

## 🚀 Live Demo

Open `index.html` in your browser - no installation required!

## 🎯 Usage

1. Open `index.html` in your browser
2. Drag and drop a folder onto the drop zone
3. View your folder structure instantly
4. Use filters to exclude files/folders
5. Export or copy the structure as needed

### Exclusion Patterns

Use wildcards to filter files:
- `*.log` - excludes all .log files  
- `node_modules` - excludes node_modules folder
- `test_*` - excludes everything starting with test_

### Preset Filters

- **Default**: Common development files (.git, node_modules, etc.)
- **Minimal**: Only .git and .DS_Store
- **None**: No exclusions
- **No Media**: Excludes images, videos, and audio files
- **Full Dev**: Comprehensive development exclusions

## 🎨 Themes

Switch between 6 carefully crafted themes:
- 🌙 **Dark** - Easy on the eyes
- ☀️ **Light** - Clean and bright
- 🌊 **Ocean** - Deep blue tones
- 🌲 **Forest** - Natural green palette
- 🌅 **Sunset** - Warm purple and pink
- 🎮 **Cyberpunk** - Neon cyan and purple

## 🌍 Languages

The application supports:
- 🇫🇷 French (Français)
- 🇬🇧 English

## 📊 Statistics

View detailed statistics about your folder:
- Language distribution (pie chart)
- Top 5 largest files
- Total lines of code
- Average lines per file
- Detected programming languages

## 💾 Export Formats

- **TXT**: Plain text tree structure
- **JSON**: Structured data format
- **Markdown**: GitHub-compatible tree
- **CSV**: Spreadsheet-compatible format

## 🛠️ Technologies

- Pure HTML5, CSS3, JavaScript
- Chart.js for statistics visualization
- Font Awesome for icons

## 📝 License

MIT License - feel free to use in your projects!

## 🤝 Contributing

Contributions are welcome! Feel free to submit issues and pull requests.

---

Made with ❤️ using vanilla JavaScript