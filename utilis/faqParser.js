/*
 * A reguláris kifejezésekben különleges
 * karaktereket biztonságossá alakítja.
 *
 * Ez azért szükséges, mert a címformátumban
 * lehet például *, [, ], (, ) vagy más jel.
 */
function escapeRegExp(text) {
    return String(text)
        .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/*
 * Ellenőrzi, hogy a címformátum megfelelő-e.
 *
 * Kötelezően tartalmaznia kell pontosan egy
 * {CÍM} helyőrzőt.
 */
function validateTitleFormat(titleFormat) {
    if (!titleFormat) {
        return {
            valid: false,
            error:
                'A címformátum nem lehet üres.'
        };
    }

    const placeholder = '{CÍM}';

    const parts = String(titleFormat)
        .split(placeholder);

    if (parts.length !== 2) {
        return {
            valid: false,
            error:
                'A címformátumnak pontosan egy ' +
                '{CÍM} helyőrzőt kell tartalmaznia.'
        };
    }

    return {
        valid: true,
        prefix: parts[0],
        suffix: parts[1]
    };
}

/*
 * Kinyeri a címet az üzenet első sorából.
 *
 * Példa:
 *
 * titleFormat:
 * **__{CÍM}__**
 *
 * firstLine:
 * **__Teleltetés__**
 *
 * eredmény:
 * Teleltetés
 */
function extractTitle(firstLine, titleFormat) {
    const validation =
        validateTitleFormat(titleFormat);

    if (!validation.valid) {
        return null;
    }

    const prefix =
        escapeRegExp(validation.prefix);

    const suffix =
        escapeRegExp(validation.suffix);

    const titleRegex = new RegExp(
        `^${prefix}(.+?)${suffix}$`
    );

    const match = String(firstLine || '')
        .trim()
        .match(titleRegex);

    if (!match) {
        return null;
    }

    const title = match[1].trim();

    return title || null;
}

/*
 * Feldolgozza az üzenet szövegét.
 *
 * Ha az első sor megfelel a címformátumnak,
 * különválasztja a címet és a szöveget.
 *
 * Ha nincs felismerhető cím, a teljes üzenet
 * tartalomként marad meg.
 */
function parseFaqContent(
    rawContent,
    titleFormat
) {
    const normalizedContent =
        String(rawContent || '')
            .replace(/\r\n/g, '\n')
            .trim();

    if (!normalizedContent) {
        return {
            title: null,
            content: ''
        };
    }

    const lines =
        normalizedContent.split('\n');

    const firstLine =
        lines[0].trim();

    const title =
        extractTitle(
            firstLine,
            titleFormat
        );

    if (!title) {
        return {
            title: null,
            content: normalizedContent
        };
    }

    const content = lines
        .slice(1)
        .join('\n')
        .trim();

    return {
        title,
        content
    };
}

/*
 * Az embedek látható szövegét is összegyűjti.
 *
 * Így a más botok által küldött embedek
 * tartalmában is lehet majd keresni.
 */
function collectEmbedText(message) {
    const parts = [];

    for (const embed of message.embeds || []) {
        if (embed.title) {
            parts.push(embed.title);
        }

        if (embed.description) {
            parts.push(embed.description);
        }

        for (const field of embed.fields || []) {
            if (field.name) {
                parts.push(field.name);
            }

            if (field.value) {
                parts.push(field.value);
            }
        }

        if (embed.footer?.text) {
            parts.push(embed.footer.text);
        }

        if (embed.author?.name) {
            parts.push(embed.author.name);
        }
    }

    return parts
        .filter(Boolean)
        .join('\n')
        .trim();
}

/*
 * A csatolmányok fájlneveit összegyűjti.
 *
 * Például egy kepes_utmutato.jpg nevű
 * csatolmány később név alapján is kereshető.
 */
function collectAttachmentNames(message) {
    return Array
        .from(message.attachments?.values() || [])
        .map(attachment => attachment.name)
        .filter(Boolean)
        .join('\n')
        .trim();
}

/*
 * A csatolmányok URL-jeit tömbként adja vissza.
 */
function collectAttachmentUrls(message) {
    return Array
        .from(message.attachments?.values() || [])
        .map(attachment => attachment.url)
        .filter(Boolean);
}

/*
 * Egy teljes Discord-üzenetet átalakít olyan
 * objektummá, amelyet el lehet menteni a
 * faq_entries táblába.
 */
function messageToFaqData(
    message,
    titleFormat
) {
    const parsed = parseFaqContent(
        message.content,
        titleFormat
    );

    const embedText =
        collectEmbedText(message);

    const attachmentNames =
        collectAttachmentNames(message);

    /*
     * A kereshető tartalom részei:
     *
     * - normál üzenetszöveg;
     * - embedek szövege;
     * - csatolmányok fájlnevei.
     */
    const searchableParts = [
        parsed.content,
        embedText,
        attachmentNames
    ].filter(Boolean);

    const searchableContent =
        searchableParts.join('\n\n').trim();

    return {
        guildId: message.guild.id,
        channelId: message.channel.id,
        messageId: message.id,

        title: parsed.title,
        content: searchableContent,

        messageUrl: message.url,

        authorId:
            message.author?.id || null,

        authorName:
            message.author?.username ||
            message.author?.tag ||
            null,

        attachmentUrls:
            collectAttachmentUrls(message),

        discordCreatedAt:
            message.createdAt
                ? message.createdAt.toISOString()
                : null,

        discordEditedAt:
            message.editedAt
                ? message.editedAt.toISOString()
                : null
    };
}

module.exports = {
    validateTitleFormat,
    extractTitle,
    parseFaqContent,
    collectEmbedText,
    collectAttachmentNames,
    collectAttachmentUrls,
    messageToFaqData
};