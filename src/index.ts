// tslint:disable: no-require-imports
const basePath = "Z:\\youtube";
const ytdl = require("ytdl-core");
const fs = require("fs-extra");
const ffmpeg = require("fluent-ffmpeg");
const binaries = require("ffmpeg-binaries");

import * as log from "./log";
import * as path from "path";

const d = new Date();
const mm = d.getMonth() + 1;
const dd = d.getDate();
const yy = d.getFullYear();
const todayDate = yy + "-" + mm + "-" + dd;
const mp3File = "mp3.txt";
const mp4File = "mp4.txt";

enum VideoType {
    Mp3,
    Mp4,
}

interface Mp4VideoInfo {
    filePath: string;
    folderPath: string;
    title: string;
}

function getVideoId(url: string): string {
    const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
}

function sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9]/gi, "");
}

function loadVideoUrls(videoType: VideoType): Promise<string[]> {
    const result: string[] = [];
    return new Promise(async (resolve, reject) => {
        if (videoType === VideoType.Mp3) {
            const content = await fs.readFile(path.join(basePath, mp3File), "utf-8");
            (content || "").split("\n").forEach((url: string) => {
                if (url) {
                    result.push(url.trim());
                }
            });
            resolve(result);
        } else if (videoType === VideoType.Mp4) {
            const content = await fs.readFile(path.join(basePath, mp4File), "utf-8");
            (content || "").split("\n").forEach((url: string) => {
                if (url) {
                    result.push(url.trim());
                }
            });
            resolve(result);
        }
    });
}

async function downloadAllMp4() {
    const urls = await loadVideoUrls(VideoType.Mp4);
    if (!urls.length) {
        log.info(`No urls found for mp4 for ${todayDate}`);
        return;
    }
    for(const url of urls) {
        const id = getVideoId(url);
        if (id) {
            const info = await ytdl.getInfo(id);
            downloadMp4({ id, title: info.videoDetails.title, filter: "audioandvideo", forMp4: true });
        } else {
            log.error(`The url (${url}) is not in valid format.`);
        }
    }
}

async function downloadAllMp3() {
    const urls = await loadVideoUrls(VideoType.Mp3);
    if (!urls.length) {
        log.info(`No urls found for mp3 for ${todayDate}`);
        return;
    }
    for(const url of urls) {
        const id = getVideoId(url);
        if (id) {
            const info = await ytdl.getInfo(id);
            const file = await downloadMp4({ id, title: info.title, filter: "audioonly", forMp4: false });
            await convertMp4ToMp3(file);
        }
    }
}

function downloadMp4(options: { id: string, title: string, filter: string, forMp4: boolean }): Promise<Mp4VideoInfo> {
    return new Promise((resolve, reject) => {
        const sanitizeTitle = sanitizeFileName(options.title);
        const folderPath = path.join(basePath, todayDate, options.forMp4 ? "mp4" : "mp3");
        const filePath = path.join(folderPath, `${sanitizeTitle}.mp4`);
        log.info(`${sanitizeTitle} - Start downloading ${options.id}`);
        fs.ensureDir(folderPath, () => {
            const videoObject = ytdl(options.id, { filter: options.filter, quality: "highest" });
            videoObject.pipe(fs.createWriteStream(filePath)).on("finish", () => {
                log.info(`${sanitizeTitle} - Download finished on ${folderPath}.`);
                const info: Mp4VideoInfo = { filePath, folderPath, title: `${sanitizeTitle}.mp3` };
                resolve(info);
            });
        });
    });
}

function convertMp4ToMp3(info: Mp4VideoInfo) {
    return new Promise((resolve, reject) => {
        ffmpeg(info.filePath)
            .setFfmpegPath(binaries.ffmpegPath())
            .format("mp3")
            .audioBitrate(320)
            .output(fs.createWriteStream(path.join(info.folderPath, info.title)))
            .on("end", () => {
                fs.unlinkSync(info.filePath);
                resolve();
            })
            .run();
    });
}

function cleanUp() {
    const cleanUpFile = (fileName: string) => {
        fs.writeFile(path.join(basePath, fileName), "", (err: any) => {
            if (err) {
                log.error(`Failed to clean ${fileName}`);
            } else {
                log.info(`Successfully clean ${fileName}`);
            }
        });
    };
    cleanUpFile(mp3File);
    cleanUpFile(mp4File);
}

async function init() {
    await downloadAllMp4();
    await downloadAllMp3();
    cleanUp();
}

init();
