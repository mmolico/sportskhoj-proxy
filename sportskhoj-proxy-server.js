/**
 * SPORTSKHOJ - India Sports News Proxy Server
 * Versão: v0.1 Beta
 * Data: 2 Abril 2025
 * 
 * CHANGELOG v0.1 Beta:
 * - Primeira versão funcional
 * - ESPNCricinfo: navegação interna + remoção de ads
 * - BCCI: navegação interna
 * - India TV News: navegação interna + scroll fix
 * - Sistema de versionamento implementado
 */

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());

const ALLOWED_SITES = {
    'espncricinfo': 'https://www.espncricinfo.com',
    'bcci': 'https://www.bcci.tv',
    'indiatvnews': 'https://www.indiatvnews.com/sports'
};

app.get('/proxy/:site', async (req, res) => {
    const { site } = req.params;
    let targetUrl = ALLOWED_SITES[site];

    if (!targetUrl) {
        return res.status(400).send(`
            <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 40px;
                            text-align: center;
                            background: #f5f5f5;
                        }
                        .error-box {
                            background: white;
                            padding: 30px;
                            border-radius: 10px;
                            max-width: 500px;
                            margin: 0 auto;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        h1 { color: #e74c3c; }
                        .version { 
                            color: #95a5a6; 
                            font-size: 12px; 
                            margin-top: 20px;
                        }
                    </style>
                </head>
                <body>
                    <div class="error-box">
                        <h1>⚠️ Site Not Allowed</h1>
                        <p>The site "<strong>${site}</strong>" is not configured.</p>
                        <p><strong>Available sites:</strong></p>
                        <p>espncricinfo, bcci, indiatvnews</p>
                        <p class="version">SPORTSKHOJ v0.1 Beta</p>
                    </div>
                </body>
            </html>
        `);
    }

    // Navegação interna
    if (req.query.url) {
        const decodedUrl = decodeURIComponent(req.query.url);
        const baseUrl = new URL(targetUrl);
        targetUrl = `${baseUrl.origin}${decodedUrl}`;
    }

    try {
        console.log(`[SPORTSKHOJ v0.1] Fetching: ${targetUrl}`);
        
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-IN,en;q=0.9,hi;q=0.8',
                'Cache-Control': 'no-cache'
            },
            redirect: 'follow'
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let html = await response.text();
        const baseUrl = new URL(targetUrl);

        // Transformações base
        html = html.replace(/src="\/([^"]*)"/g, `src="${baseUrl.origin}/$1"`);
        html = html.replace(/src='\/([^']*)'/g, `src='${baseUrl.origin}/$1'`);
        html = html.replace(/data-src="\/([^"]*)"/g, `data-src="${baseUrl.origin}/$1"`);
        html = html.replace(/srcset="\/([^"]*)"/g, `srcset="${baseUrl.origin}/$1"`);
        
        html = html.replace('<head>', `<head><base href="${targetUrl}/" target="_self">`);

        // ═══════════════════════════════════════════════════
        // ESPNCricinfo - Tratamento específico
        // ═══════════════════════════════════════════════════
        if (site === 'espncricinfo') {
            // Reescrita de links
            html = html.replace(/href="\/([^"]*)"(?![^<]*\.css)/g, (match, path) => {
                if (path.includes('.css') || path.includes('.js')) {
                    return `href="${baseUrl.origin}/${path}"`;
                }
                return `href="/proxy/espncricinfo?url=${encodeURIComponent('/' + path)}"`;
            });

            const css = `
                <style id="sportskhoj-espn">
                    html, body { overflow-y: auto !important; }
                    .ad-container, iframe[src*="doubleclick"] { display: none !important; }
                </style>
            `;
            html = html.replace('</head>', `${css}</head>`);
        }

        // ═══════════════════════════════════════════════════
        // BCCI - Tratamento específico
        // ═══════════════════════════════════════════════════
        if (site === 'bcci') {
            html = html.replace(/href="\/([^"]*)"(?![^<]*\.css)/g, (match, path) => {
                if (path.includes('.css') || path.includes('.js')) {
                    return `href="${baseUrl.origin}/${path}"`;
                }
                return `href="/proxy/bcci?url=${encodeURIComponent('/' + path)}"`;
            });

            const css = `
                <style id="sportskhoj-bcci">
                    html, body { overflow-y: auto !important; }
                    .ad-container { display: none !important; }
                </style>
            `;
            html = html.replace('</head>', `${css}</head>`);
        }

        // ═══════════════════════════════════════════════════
        // India TV News - Tratamento específico
        // ═══════════════════════════════════════════════════
        if (site === 'indiatvnews') {
            html = html.replace(/href="\/([^"]*)"(?![^<]*\.css)/g, (match, path) => {
                if (path.includes('.css') || path.includes('.js')) {
                    return `href="${baseUrl.origin}/${path}"`;
                }
                return `href="/proxy/indiatvnews?url=${encodeURIComponent('/' + path)}"`;
            });

            const css = `
                <style id="sportskhoj-itv">
                    html, body { overflow-y: auto !important; }
                    .ad-container, iframe[src*="doubleclick"] { display: none !important; }
                </style>
            `;
            html = html.replace('</head>', `${css}</head>`);
        }

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('X-Frame-Options', 'ALLOWALL');
        res.setHeader('Content-Security-Policy', '');
        res.setHeader('Access-Control-Allow-Origin', '*');
        
        res.send(html);
        
    } catch (error) {
        console.error(`[SPORTSKHOJ v0.1] Error: ${error.message}`);
        res.status(500).send(`
            <html>
                <head>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            padding: 40px;
                            text-align: center;
                            background: #f5f5f5;
                        }
                        .error-box {
                            background: white;
                            padding: 30px;
                            border-radius: 10px;
                            max-width: 500px;
                            margin: 0 auto;
                            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                        }
                        h1 { color: #e74c3c; }
                        a {
                            display: inline-block;
                            margin-top: 20px;
                            padding: 10px 20px;
                            background: #3498db;
                            color: white;
                            text-decoration: none;
                            border-radius: 5px;
                        }
                    </style>
                </head>
                <body>
                    <div class="error-box">
                        <h1>⚠️ Error Loading ${site}</h1>
                        <p>${error.message}</p>
                        <a href="${targetUrl}" target="_blank">Open Original Site →</a>
                        <p style="color: #95a5a6; font-size: 12px; margin-top: 20px;">SPORTSKHOJ v0.1 Beta</p>
                    </div>
                </body>
            </html>
        `);
    }
});

app.get('/', (req, res) => {
    res.send(`
        <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        text-align: center;
                        padding: 50px;
                        background: linear-gradient(135deg, #FF9933 0%, #138808 100%);
                        color: white;
                    }
                    .container {
                        background: white;
                        color: #2c3e50;
                        padding: 40px;
                        border-radius: 15px;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                        max-width: 600px;
                        margin: 0 auto;
                    }
                    h1 { margin: 0 0 10px 0; color: #FF9933; }
                    .version { 
                        display: inline-block;
                        background: #138808;
                        color: white;
                        padding: 5px 15px;
                        border-radius: 15px;
                        font-size: 14px;
                        margin: 10px 0 20px 0;
                    }
                    .status { color: #27ae60; font-weight: 600; }
                    .sites { 
                        text-align: left;
                        margin-top: 20px;
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 8px;
                    }
                    .site-item { 
                        padding: 8px 0;
                        border-bottom: 1px solid #dee2e6;
                    }
                    .site-item:last-child { border-bottom: none; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>🏏 SPORTSKHOJ Proxy Server</h1>
                    <div class="version">v0.1 Beta</div>
                    <p class="status">Server is running!</p>
                    <p style="font-size: 12px; color: #7f8c8d;">Last updated: 2 April 2025</p>
                    
                    <div class="sites">
                        <strong>Available Sites:</strong>
                        <div class="site-item">🏏 ESPNCricinfo (full coverage)</div>
                        <div class="site-item">🏏 BCCI.tv (official board)</div>
                        <div class="site-item">🏏 India TV Sports (news)</div>
                    </div>
                </div>
            </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`🏏 SPORTSKHOJ v0.1 Beta running on port ${PORT}`);
});
