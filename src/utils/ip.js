/**
 * Fetches the user's public IP and then gets location info from the VORE API.
 * @returns {Promise<{province: string, city: string, district: string}>}
 */
export async function getLocationByIP() {
    try {
        // Step 1: Get public IP
        const ipRes = await fetch('http://api.ipify.cn/');
        const ip = (await ipRes.text()).trim();
        if (!ip) throw new Error('No IP found');

        // Step 2: Get location info from VORE API
        const voreRes = await fetch(`https://api.vore.top/api/IPdata?ip=${ip}`);
        const voreData = await voreRes.json();
        if (voreData.code === 200 && voreData.ipdata) {
            return {
                province: voreData.ipdata.info1 || '',
                city: voreData.ipdata.info2 || '',
                district: voreData.ipdata.info3 || ''
            };
        }
    } catch (e) {
        console.warn('IP定位失败', e);
    }
    return { province: '', city: '', district: '' };
} 