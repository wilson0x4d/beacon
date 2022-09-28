import { FormData } from 'formdata-node';
export default class JsonFormBuilder {
    build(obj) {
        const form = new FormData();
        for (const key in obj) {
            if (Object.hasOwnProperty.call(obj, key)) {
                const value = obj[key];
                form.set(key, `${value}`);
            }
        }
        return form;
    }
}