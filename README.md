# Service Center Site

Статический сайт сервисного центра на основе базы `323pr_Bakunovskiy_CENTR`.

## Что внутри

- `index.html`, `styles.css`, `app.js` - готовый сайт без сборки.
- `data/service-center-data.js` - данные, перенесенные из SQL-заполнения.
- `database/schema.sql` - структура MS SQL базы из `SQLQuery3.sql`.
- `database/seed.sql` - заполнение базы из `SQLQuery4.sql`.
- `assets/service-bench.png` - локальный визуальный ассет для страницы.

## Как открыть локально

Можно открыть `index.html` напрямую в браузере. Если нужен локальный сервер:

```powershell
cd "C:\Users\User\Documents\Чат джпт\service-center-site"
py -m http.server 8080
```

Потом открыть `http://localhost:8080`.

Если в системе настроен обычный `python`, можно использовать `python -m http.server 8080`.

## Как выложить на GitHub Pages

1. Создать репозиторий на GitHub.
2. Загрузить содержимое папки `service-center-site` в корень репозитория.
3. Открыть `Settings -> Pages`.
4. В `Build and deployment` выбрать `GitHub Actions`.
5. Открыть вкладку `Actions` и дождаться выполнения `Deploy static site to GitHub Pages`.
6. Ссылка появится в `Settings -> Pages`.

В проект уже добавлен workflow `.github/workflows/pages.yml`, поэтому отдельная сборка не нужна.

## Быстрая загрузка через Git

```powershell
cd "C:\Users\User\Documents\Чат джпт\service-center-site"
git init
git add .
git commit -m "Add service center GitHub Pages site"
git branch -M main
git remote add origin https://github.com/USER/REPOSITORY.git
git push -u origin main
```

В команде `git remote add origin` нужно заменить `USER/REPOSITORY` на свой репозиторий.

## Про SQL-подключение

GitHub Pages не запускает MS SQL Server и backend-код. Поэтому сайт сделан в GitHub Pages-совместимом режиме: SQL-данные экспортированы в `data/service-center-data.js`, а изменения заказов сохраняются в `localStorage` браузера.

Для настоящего живого подключения к MS SQL нужен отдельный backend, например ASP.NET Core, Node.js/Express или PHP, размещенный на Render, Railway, Azure, VPS или другом сервере. В таком варианте этот frontend можно оставить, заменив чтение `service-center-data.js` на запросы к API.
