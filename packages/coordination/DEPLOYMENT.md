# Statuz Coordination Pool - 云服务器部署指南

## 方案一：Docker Compose 部署（推荐 ⭐）

### 适用场景
- 完全控制
- 数据本地存储
- 适合有 VPS 的用户

### 步骤

#### 1. 在服务器上安装 Docker

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker

# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
```

#### 2. 上传代码到服务器

```bash
# 在本地项目目录执行
scp -r packages/coordination user@your-server:/home/user/statuz-coordination/
```

#### 3. 在服务器上启动

```bash
cd /home/user/statuz-coordination
docker-compose up -d
```

#### 4. 配置 Nginx 反向代理（可选但推荐）

```bash
sudo apt install nginx -y
```

创建 Nginx 配置：

```bash
sudo nano /etc/nginx/sites-available/statuz-coordination
```

写入：

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 换成你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/statuz-coordination /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. 配置 SSL 证书（可选）

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

---

## 方案二：PM2 直接部署

### 适用场景
- 没有 Docker
- 简单快速

### 步骤

#### 1. 安装 Node.js 和 PM2

```bash
# 安装 Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 安装 PM2
sudo npm install -g pm2
```

#### 2. 上传代码并启动

```bash
# 上传代码
scp -r packages/coordination user@your-server:/home/user/

# 安装依赖
cd /home/user/coordination
npm install

# 使用 PM2 启动
pm2 start src/index.ts --name statuz-coordination

# 设置开机自启
pm2 startup
pm2 save
```

#### 3. 配置 Nginx（同上）

---

## 方案三：Vercel 部署（未来支持）

Coming soon! 当前版本使用文件存储，Vercel 部署需要迁移到数据库。

### 需要的改动
1. 添加 Prisma + PostgreSQL
2. 添加 Vercel 适配层

---

## 方案四：Railway 部署

### 步骤

1. 注册 [Railway](https://railway.app)
2. 连接 GitHub 仓库
3. 添加 PostgreSQL 数据库
4. 设置环境变量：
   - `PORT`: 3000
   - `DATABASE_URL`: PostgreSQL 连接字符串
5. Deploy

---

## 数据备份与恢复

### 备份

```bash
# 定期备份 data 目录
tar -czf statuz-backup-$(date +%Y%m%d).tar.gz data/
```

### 恢复

```bash
# 停止服务
docker-compose down

# 恢复数据
tar -xzf statuz-backup-20240101.tar.gz

# 重新启动
docker-compose up -d
```

---

## 环境变量配置

创建 `.env` 文件：

```bash
PORT=3000
# 可选：添加 API Key 认证（后续版本支持）
# STATUZ_API_KEY=your-secret-key
```

---

## 监控与日志

### Docker 日志

```bash
# 查看日志
docker-compose logs -f

# 查看特定容器的日志
docker logs -f statuz-coordination
```

### PM2 日志

```bash
# 查看日志
pm2 logs statuz-coordination

# 查看实时日志
pm2 logs statuz-coordination --lines 100 --nostream
```

---

## 防火墙配置

```bash
# Ubuntu/Debian (ufw)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# 如果不使用 Nginx，也需要开放 3000
sudo ufw allow 3000/tcp
```

---

## 快速检查清单

- [ ] 服务器有公网 IP
- [ ] 域名解析已配置（可选）
- [ ] Docker 已安装
- [ ] 端口 80/443 已开放
- [ ] 数据目录有写入权限
- [ ] 服务启动成功
- [ ] 防火墙配置正确
- [ ] 可以从外部访问

---

## 测试部署

在本地浏览器访问：

```bash
# 直接 IP 访问
http://your-server-ip:3000/health

# 域名访问（如果配置了）
http://your-domain.com/health
```

应该返回：

```json
{
  "success": true,
  "service": "statuz-coordination",
  "version": "0.1.0",
  "status": "running"
}
```

---

## 故障排查

### 服务启动失败

```bash
# 检查日志
docker-compose logs statuz-coordination

# 常见问题：
# 1. 端口被占用 → 改 PORT 环境变量
# 2. 权限问题 → chmod -R 755 data/
```

### 无法从外部访问

```bash
# 检查防火墙
sudo ufw status

# 检查端口监听
netstat -tlnp | grep 3000
```

### Nginx 502 错误

```bash
# 检查服务是否运行
curl http://localhost:3000/health

# 检查 Nginx 配置
sudo nginx -t
```

---

## 更新部署

```bash
# 拉取新代码
git pull

# 重新构建
docker-compose build

# 重启服务
docker-compose up -d
```
