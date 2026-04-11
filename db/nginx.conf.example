# /etc/nginx/sites-available/cookiebam.com
server {
    listen 80;
    server_name cookiebam.com;

    root /home/ubuntu/nginx/main;

    client_max_body_size 16k;

    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;
    add_header Content-Security-Policy "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'; base-uri 'none'; frame-ancestors 'none'" always;

    location = / {
        return 302 /ply/share/;
    }

    location /generate {
        limit_except POST { deny all; }
        proxy_pass http://127.0.0.1:8000/generate;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /s/ {
        proxy_pass http://127.0.0.1:8000/s/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /ply/ {
        try_files $uri $uri/ =404;
    }
}
