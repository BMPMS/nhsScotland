import { mount } from 'svelte';
import '@fontsource/source-sans-3/400.css';
import '@fontsource/source-sans-3/600.css';
import './styles/global.css';
import App from './App.svelte';

export default mount(App, { target: document.getElementById('app') });
