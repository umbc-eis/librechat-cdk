import * as fs from 'fs';
import * as path from 'path';
import { StackConfig } from '../lib/interfaces/stack-config';

function deepMerge(target: any, source: any): any {
    const output = { ...target };
    
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target)) {
                    output[key] = source[key];
                } else {
                    output[key] = deepMerge(target[key], source[key]);
                }
            } else {
                output[key] = source[key];
            }
        });
    }
    
    return output;
}

function isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
}

export function loadConfig(): StackConfig {
    const configPath = path.join(__dirname, '../config/config.json');
    const localConfigPath = path.join(__dirname, '../config/config.local.json');
    
    if (!fs.existsSync(configPath)) {
        throw new Error('Configuration file not found. Please ensure config.json exists in the config directory.');
    }

    try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        let config = JSON.parse(configContent) as StackConfig;
        
        // Override with local config if it exists (deep merge)
        if (fs.existsSync(localConfigPath)) {
            console.log('Loading local configuration overrides from config.local.json');
            const localConfigContent = fs.readFileSync(localConfigPath, 'utf8');
            const localConfig = JSON.parse(localConfigContent);
            config = deepMerge(config, localConfig) as StackConfig;
        }
        
        return config;
    } catch (error) {
        console.error('Error loading configuration:', error);
        throw error;
    }
}