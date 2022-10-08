import { useLocation } from "react-router-dom";

function safeJson(s: string|null|undefined) {
    if (s) try {
        return JSON.parse(s);
    } catch (ex) {}
    return undefined;
}

export function pageState(): PageState {
    const location = useLocation();
    const currentState = location.hash === '#clear' ? {} : safeJson(localStorage.state) || {};
    if (location.hash.startsWith('#{')) {
        const newState = safeJson(decodeURIComponent(location.hash.slice(1)));
        if (newState) {
            // deep merge
            Object.assign(currentState, newState)
            localStorage.state = JSON.stringify(currentState);
        }
    }
    return currentState;
}

interface PageState {
    dashboard?:{
        featureNames?: string[]
    }
    home?:{
        featureNames?: string[]
    }
}