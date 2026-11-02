import json,os
os.makedirs('dist',exist_ok=True)
shell=open('1_shell.html').read()
js='\n'.join(open(f).read() for f in ['2_core.js','3_ui.js','4_sales.js','5_make.js','6_more.js'])
html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#ffffff"><meta name="apple-mobile-web-app-capable" content="yes"><link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 64 64%22%3E%3Crect width=%2264%22 height=%2264%22 rx=%2214%22 fill=%22%23161d26%22/%3E%3Cpath d=%22M20 24h24l-12 22z%22 fill=%22%23d6a64c%22/%3E%3Cpath d=%22M20 24l6-8h12l6 8z%22 fill=%22%23f0cf86%22/%3E%3C/svg%3E"></head><body>'+shell+'<script>\n'+js+'\n</script></body></html>'
open('dist/index.html','w').write(html)
open('dist/app.js','w').write(js)
w=open('server/worker.src.js').read().replace('const APP_HTML = __APP_HTML__;','const APP_HTML = '+json.dumps(html)+';')
open('dist/worker.js','w').write(w)
print(len(html),len(w))
