const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_URL = 'http://localhost:1337/api';
const MEDIA_FOLDER_LOCAL = 'C:/Users/Alexlabel/Desktop/strapi-images'; // <-- поменяй под себя!
const MEDIA_FOLDER_SERVER = '/var/www/strapi-media'; // путь на сервере, если есть

// Режим загрузки медиа: true — автоматическая загрузка из папки, false — ручная загрузка (через админку)
const UPLOAD_MEDIA_AUTOMATICALLY = true;

// Задержка между запросами
const delay = ms => new Promise(res => setTimeout(res, ms));

// Загружаем файл и возвращаем ID медиа в Strapi
async function uploadMedia(filePath) {
    try {
        const fileName = path.basename(filePath);
        const fileStream = fs.createReadStream(filePath);

        const formData = new require('form-data')();
        formData.append('files', fileStream, fileName);

        const response = await axios.post(`${API_URL}/upload`, formData, {
            headers: {
                ...formData.getHeaders()
            }
        });

        const uploadedFile = response.data[0];
        console.log(`✅ Uploaded media: ${uploadedFile.name}`);
        return uploadedFile.id;
    } catch (error) {
        console.error('❌ Media upload failed:', error.message);
        return null;
    }
}

// Получить сущность (бренд, регион) по slug (UID)
async function getEntityBySlug(collection, slug) {
    try {
        const res = await axios.get(`${API_URL}/${collection}`, {
            params: {
                filters: { slug: slug }
            }
        });
        const data = res.data.data;
        if (data.length > 0) return data[0].id;
        return null;
    } catch (err) {
        console.error(`❌ Error fetching ${collection} by slug "${slug}":`, err.message);
        return null;
    }
}

// Подгружаем JSON и обрабатываем данные
async function importCollection(name, filePath) {
    try {
        let raw = fs.readFileSync(path.resolve(__dirname, filePath), 'utf-8');
        raw = raw.replace(/^\uFEFF/, ''); // Удаляем BOM, если есть
        const items = JSON.parse(raw);

        for (const item of items) {
            // Автоматически подставляем brand и region id из slug
            if (item.brand && typeof item.brand === 'string') {
                const brandId = await getEntityBySlug('brands', item.brand);
                if (!brandId) {
                    console.warn(`⚠ Brand with slug "${item.brand}" not found. Skipping item.`);
                    continue;
                }
                item.brand = brandId;
            }

            if (item.region && typeof item.region === 'string') {
                // Регионы теперь отдельная коллекция, аналогично брендам
                const regionId = await getEntityBySlug('regions', item.region);
                if (!regionId) {
                    console.warn(`⚠ Region with slug "${item.region}" not found. Skipping item.`);
                    continue;
                }
                item.region = regionId;
            }

            // Обработка медиа в объекте
            if (UPLOAD_MEDIA_AUTOMATICALLY) {
                // Пример для бренда: logo - строка с именем файла
                if (item.logo) {
                    const logoPathLocal = path.join(MEDIA_FOLDER_LOCAL, item.logo);
                    const logoPathServer = path.join(MEDIA_FOLDER_SERVER, item.logo);
                    let logoId = null;

                    if (fs.existsSync(logoPathLocal)) {
                        logoId = await uploadMedia(logoPathLocal);
                    } else if (fs.existsSync(logoPathServer)) {
                        logoId = await uploadMedia(logoPathServer);
                    } else {
                        console.warn(`⚠ Logo file "${item.logo}" not found in media folders.`);
                    }
                    if (logoId) {
                        item.logo = logoId; // в Strapi media поле — это ID файла
                    }
                }

                // Если есть слайды, модели, галереи с картинками — можно добавить аналогичную логику
                // Ниже пример для promo-pages слайдов:
                if (item.slides && Array.isArray(item.slides)) {
                    for (const slide of item.slides) {
                        if (slide.image) {
                            const slidePathLocal = path.join(MEDIA_FOLDER_LOCAL, slide.image);
                            const slidePathServer = path.join(MEDIA_FOLDER_SERVER, slide.image);
                            let slideId = null;
                            if (fs.existsSync(slidePathLocal)) {
                                slideId = await uploadMedia(slidePathLocal);
                            } else if (fs.existsSync(slidePathServer)) {
                                slideId = await uploadMedia(slidePathServer);
                            } else {
                                console.warn(`⚠ Slide image "${slide.image}" not found.`);
                            }
                            if (slideId) slide.image = slideId;
                        }
                    }
                }

                // Аналогично для моделей:
                if (item.models && Array.isArray(item.models)) {
                    for (const model of item.models) {
                        if (model.image) {
                            const modelPathLocal = path.join(MEDIA_FOLDER_LOCAL, model.image);
                            const modelPathServer = path.join(MEDIA_FOLDER_SERVER, model.image);
                            let modelId = null;
                            if (fs.existsSync(modelPathLocal)) {
                                modelId = await uploadMedia(modelPathLocal);
                            } else if (fs.existsSync(modelPathServer)) {
                                modelId = await uploadMedia(modelPathServer);
                            } else {
                                console.warn(`⚠ Model image "${model.image}" not found.`);
                            }
                            if (modelId) model.image = modelId;
                        }
                    }
                }
            } else {
                // Ручной режим — пропускаем загрузку медиа, предполагается, что они добавлены вручную
                // Можно удалить поля с картинками, если Strapi требует или оставить как есть
            }

            // POST запрос на добавление записи
            try {
                await axios.post(`${API_URL}/${name}`, { data: item });
                console.log(`✅ Imported ${name}:`, item.name || item.title || 'item');
                await delay(300);
            } catch (err) {
                console.error(`❌ Error importing ${name}:`, err.response?.data || err.message);
            }
        }
    } catch (err) {
        console.error(`❌ Failed to import ${name}:`, err.message);
    }
}

// Главная функция запуска
async function main() {
    console.log(`Загрузка данных в Strapi: media загрузка ${UPLOAD_MEDIA_AUTOMATICALLY ? 'автоматическая' : 'ручная'}`);
    
    await importCollection('brands', './seeds/brands.json');
    await importCollection('regions', './seeds/regions.json');
    await importCollection('regions', './seeds/models.json');
    await importCollection('promo-pages', './seeds/promo-pages.json');

    console.log('✅ All seeds imported');
}

main();