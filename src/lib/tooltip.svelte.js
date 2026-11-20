export const tooltip = $state({ visible: false, x: 0, y: 0, title: '', lines: [], border: null });

export const showTip = (event, title, lines = [], border = null) => Object.assign(tooltip, { visible: true, x: event.clientX, y: event.clientY, title, lines, border });

export const hideTip = () => {
  tooltip.visible = false;
};
