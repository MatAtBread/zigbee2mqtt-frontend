declare namespace StyleCssModule {
    export interface IStyleCss {
        "action-colum": string;
        actions: string;
        adaptive: string;
        green: string;
        invisible: string;
    }
}

declare const StyleCssModule: StyleCssModule.IStyleCss & {
    /** WARNING: Only available when `css-loader` is used without `style-loader` or `mini-css-extract-plugin` */
    locals: StyleCssModule.IStyleCss;
};

export = StyleCssModule;
