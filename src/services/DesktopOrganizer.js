const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const http = require('http');
const { parse } = require('pptxtojson/dist/index.cjs');
const mammoth = require('mammoth');

class DesktopOrganizer {
    constructor(llmConfig, logCallback) {
        this.llmConfig = llmConfig;
        this.logCallback = logCallback || ((msg) => console.log(msg));
        this.desktopPath = path.join(os.homedir(), 'Desktop');
        this.subjects = ['语文', '数学', '英语', '物理', '化学', '生物', '政治', '历史', '地理'];

        // 日志级别配置
        this.logLevels = {
            INFO: { tag: '📋 INFO', color: '#3498db' },
            SUCCESS: { tag: '✅ SUCCESS', color: '#2ecc71' },
            WARNING: { tag: '⚠️  WARNING', color: '#f39c12' },
            ERROR: { tag: '❌ ERROR', color: '#e74c3c' },
            LLM: { tag: '🤖 LLM', color: '#9b59b6' },
            FILE: { tag: '📁 FILE', color: '#1abc9c' },
            PARSE: { tag: '🔍 PARSE', color: '#16a085' },
            RENAME: { tag: '✏️  RENAME', color: '#e67e22' }
        };
    }

    log(message, level = 'INFO') {
        const logConfig = this.logLevels[level] || this.logLevels.INFO;
        const formattedMessage = `${logConfig.tag}  ${message}`;
        console.log(formattedMessage);
        if (this.logCallback) {
            this.logCallback(formattedMessage);
        }
    }

    async organize() {
        this.log('Starting desktop organization...', 'INFO');

        try {
            // 获取桌面上的所有文件
            const files = await this.getDesktopFiles();
            this.log(`Found ${files.length} files to organize`, 'INFO');

            if (files.length === 0) {
                this.log('No files to organize on desktop', 'WARNING');
                return;
            }

            // 逐个处理文件
            for (const file of files) {
                await this.processFile(file);
            }

            this.log('Desktop organization completed!', 'SUCCESS');
        } catch (error) {
            this.log(`Organization failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async getDesktopFiles() {
        const files = [];
        const items = fs.readdirSync(this.desktopPath);

        for (const item of items) {
            const fullPath = path.join(this.desktopPath, item);
            const stat = fs.statSync(fullPath);

            // 只处理文件，跳过文件夹
            if (stat.isFile()) {
                const ext = path.extname(item).toLowerCase();
                // 只处理支持的文档格式
                if (['.pptx', '.docx', '.pdf'].includes(ext)) {
                    files.push({
                        name: item,
                        path: fullPath,
                        ext: ext
                    });
                }
            }
        }

        return files;
    }

    async processFile(file) {
        this.log(`Processing: ${file.name}`, 'FILE');

        try {
            // 提取文件内容
            const content = await this.extractFileContent(file);
            this.log(`Extracted content, length: ${content.length} chars`, 'PARSE');

            // 调用LLM分类
            const classification = await this.classifyWithLLM(file.name, content);
            this.log(`Classification: ${classification.subject} - ${classification.reason}`, 'LLM');

            // 移动文件到对应文件夹（如果需要，会重命名）
            const finalFileName = await this.moveFileToSubject(file, classification);
            if (finalFileName !== file.name) {
                this.log(`Moved ${file.name} to ${classification.subject} folder, renamed to ${finalFileName}`, 'SUCCESS');
            } else {
                this.log(`Moved ${file.name} to ${classification.subject} folder`, 'SUCCESS');
            }

        } catch (error) {
            this.log(`Failed to process ${file.name}: ${error.message}`, 'ERROR');
        }
    }

    async extractFileContent(file) {
        try {
            // 根据文件类型选择不同的提取方法
            if (file.ext === '.pptx') {
                return await this.extractPPTXContent(file);
            } else if (file.ext === '.docx') {
                return await this.extractDOCXContent(file);
            } else if (file.ext === '.pdf') {
                return await this.extractPDFContent(file);
            } else {
                return file.name;
            }
        } catch (error) {
            this.log(`Cannot extract content from ${file.name}: ${error.message}, will use filename for classification`, 'WARNING');
            return file.name;
        }
    }

    async extractPPTXContent(file) {
        try {
            // 读取文件buffer
            const buffer = fs.readFileSync(file.path);

            // 使用pptxtojson解析
            const json = await parse(buffer.buffer);

            // 提取所有文本内容
            const textParts = [];

            // 遍历每一页幻灯片
            if (json.slides && Array.isArray(json.slides)) {
                json.slides.forEach((slide, index) => {
                    textParts.push(`\n===== 第 ${index + 1} 页 =====`);

                    // 提取页面备注
                    if (slide.note) {
                        textParts.push(`[备注] ${slide.note}`);
                    }

                    // 提取页面元素的文本内容
                    if (slide.elements && Array.isArray(slide.elements)) {
                        slide.elements.forEach(element => {
                            const text = this.extractTextFromElement(element);
                            if (text) {
                                textParts.push(text);
                            }
                        });
                    }

                    // 提取母版元素的文本内容
                    if (slide.layoutElements && Array.isArray(slide.layoutElements)) {
                        slide.layoutElements.forEach(element => {
                            const text = this.extractTextFromElement(element);
                            if (text) {
                                textParts.push(`[母版] ${text}`);
                            }
                        });
                    }
                });
            }

            const fullText = textParts.join('\n');
            this.log(`PPTX parsed successfully, extracted ${json.slides ? json.slides.length : 0} slides`, 'PARSE');

            // 限制长度，避免token过多
            return fullText.substring(0, 3000);
        } catch (error) {
            this.log(`PPTX parsing failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    extractTextFromElement(element) {
        if (!element) return '';

        // 提取文本内容（去除HTML标签）
        if (element.content) {
            // 移除HTML标签，只保留纯文本
            const text = element.content
                .replace(/<[^>]*>/g, ' ')  // 移除HTML标签
                .replace(/&nbsp;/g, ' ')   // 替换空格实体
                .replace(/\s+/g, ' ')      // 合并多个空格
                .trim();
            return text;
        }

        // 如果是组合元素，递归提取子元素
        if (element.type === 'group' && element.elements) {
            return element.elements
                .map(e => this.extractTextFromElement(e))
                .filter(t => t)
                .join(' ');
        }

        return '';
    }

    async extractDOCXContent(file) {
        try {
            // 使用mammoth提取纯文本
            const result = await mammoth.extractRawText({ path: file.path });
            const text = result.value;

            this.log(`DOCX parsed successfully, extracted ${text.length} chars`, 'PARSE');

            // 限制长度，避免token过多
            return text.substring(0, 3000);
        } catch (error) {
            this.log(`DOCX parsing failed: ${error.message}`, 'ERROR');
            throw error;
        }
    }

    async extractPDFContent(file) {
        // PDF文件暂时使用officeparser（如果已安装）
        try {
            const officeparser = require('officeparser');
            const text = await officeparser.parseOfficeAsync(file.path);
            return text.substring(0, 3000);
        } catch (error) {
            this.log(`PDF parsing requires officeparser: npm install officeparser`, 'WARNING');
            throw error;
        }
    }

    async classifyWithLLM(fileName, content) {
        const { baseUrl, apiKey, model } = this.llmConfig;

        if (!baseUrl || !apiKey || !model) {
            throw new Error('LLM configuration incomplete, please configure in settings');
        }

        const prompt = `你是一个文件分类和命名助手。请分析以下PPT/文档的内容，完成两个任务：

1. 判断它属于哪个学科
2. 评估文件名是否合理，如果文件名过于无厘头、不清晰或与内容不符，提供一个清晰、专业的新文件名

文件名: ${fileName}

文件内容:
${content}

可选科目: ${this.subjects.join('、')}

请根据文件内容的主题、关键词、知识点等信息，判断该文件最可能属于哪个学科。

关于文件名：
- 如果当前文件名清晰、合理、能体现内容主题，请在suggestedName字段返回空字符串""
- 如果当前文件名过于无厘头（如"未命名"、"新建文稿"、乱码、纯数字等）或不能体现内容，请提供一个简洁、专业、能体现主要内容的新文件名（不包含扩展名）

请以JSON格式返回分类结果，格式如下：
{"subject":"科目名称","reason":"分类理由（简要说明判断依据）","suggestedName":"建议的新文件名（如不需要改名则为空字符串）","nameReason":"改名理由（如不改名则为空字符串）"}

只返回JSON，不要其他内容。`;

        try {
            this.log(`Calling LLM API: ${baseUrl}/chat/completions`, 'LLM');
            const result = await this.httpRequest(baseUrl, apiKey, model, prompt);

            // 记录响应的前200个字符用于调试
            const preview = result.substring(0, 200);
            this.log(`API response preview: ${preview}...`, 'LLM');

            const data = JSON.parse(result);
            const resultText = data.choices[0].message.content.trim();

            // 提取JSON
            const jsonMatch = resultText.match(/\{[^}]+\}/);
            if (jsonMatch) {
                const classification = JSON.parse(jsonMatch[0]);

                // 验证科目是否有效
                if (!this.subjects.includes(classification.subject)) {
                    classification.subject = '其他';
                    classification.reason = 'Unable to identify as known subject';
                }

                return classification;
            } else {
                throw new Error('LLM returned incorrect format');
            }
        } catch (error) {
            this.log(`LLM classification failed: ${error.message}, will use default classification`, 'ERROR');
            return {
                subject: '其他',
                reason: `Classification failed: ${error.message}`
            };
        }
    }

    httpRequest(baseUrl, apiKey, model, prompt) {
        return new Promise((resolve, reject) => {
            // 确保baseUrl以 /v1 结尾或已包含完整路径
            let apiUrl = baseUrl;
            if (!apiUrl.endsWith('/')) {
                apiUrl += '/';
            }
            if (!apiUrl.includes('/chat/completions')) {
                apiUrl += 'chat/completions';
            }

            const url = new URL(apiUrl);
            const isHttps = url.protocol === 'https:';
            const httpModule = isHttps ? https : http;

            const postData = JSON.stringify({
                model: model,
                messages: [
                    { role: 'user', content: prompt }
                ],
                temperature: 0.3
            });

            const options = {
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            const req = httpModule.request(options, (res) => {
                let data = '';

                res.on('data', (chunk) => {
                    data += chunk;
                });

                res.on('end', () => {
                    if (res.statusCode >= 200 && res.statusCode < 300) {
                        resolve(data);
                    } else {
                        reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
                    }
                });
            });

            req.on('error', (error) => {
                reject(error);
            });

            req.write(postData);
            req.end();
        });
    }

    async moveFileToSubject(file, classification) {
        const { subject, suggestedName, nameReason } = classification;
        const subjectFolder = path.join(this.desktopPath, subject);

        // 创建科目文件夹（如果不存在）
        if (!fs.existsSync(subjectFolder)) {
            fs.mkdirSync(subjectFolder, { recursive: true });
            this.log(`Created folder: ${subject}`, 'FILE');
        }

        // 确定最终文件名
        let finalFileName = file.name;
        const ext = path.extname(file.name);
        const currentNameWithoutExt = path.basename(file.name, ext);

        // 如果AI建议了新文件名，使用新文件名
        if (suggestedName && suggestedName.trim() !== '') {
            // 移除建议文件名中可能存在的扩展名
            const cleanSuggestedName = suggestedName.replace(/\.(pptx|docx|pdf)$/i, '');
            finalFileName = `${cleanSuggestedName}${ext}`;
            this.log(`AI suggested rename: "${currentNameWithoutExt}" -> "${cleanSuggestedName}"`, 'RENAME');
            if (nameReason) {
                this.log(`Rename reason: ${nameReason}`, 'RENAME');
            }
        }

        // 构建目标路径
        let targetPath = path.join(subjectFolder, finalFileName);

        // 如果目标文件已存在，添加时间戳
        if (fs.existsSync(targetPath)) {
            const timestamp = Date.now();
            const nameWithoutExt = path.basename(finalFileName, ext);
            targetPath = path.join(subjectFolder, `${nameWithoutExt}_${timestamp}${ext}`);
            finalFileName = path.basename(targetPath);
            this.log(`Target file exists, added timestamp: ${finalFileName}`, 'WARNING');
        }

        // 移动文件
        fs.renameSync(file.path, targetPath);

        return finalFileName;
    }
}

module.exports = DesktopOrganizer;
