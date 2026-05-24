import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Helper to convert OKLCH and OKLAB colors to rgb() / rgba() to avoid html2canvas crashing
const parseModernColorsAndConvert = (val: string): string => {
  if (!val) return val;
  let result = val;

  const convertColorContentToRgb = (type: string, content: string): string => {
    try {
      const parts = content.split('/');
      const colorPart = parts[0].trim();
      const alphaPart = parts[1] ? parts[1].trim() : null;

      const coords = colorPart.split(/[\s,]+/).filter(Boolean);
      if (coords.length < 3) return 'rgb(120, 120, 120)';

      // If coordinates contain CSS variables, fallback gracefully
      if (content.includes('var(')) {
        if (content.includes('blue') || content.includes('primary')) return 'rgb(29, 78, 216)';
        if (content.includes('red') || content.includes('rose') || content.includes('error')) return 'rgb(225, 29, 72)';
        if (content.includes('slate') || content.includes('gray')) return 'rgb(100, 116, 139)';
        return 'rgb(100, 116, 139)';
      }

      const lStr = coords[0];
      const val1Str = coords[1];
      const val2Str = coords[2];

      let l = 0;
      if (lStr.endsWith('%')) {
        l = parseFloat(lStr) / 100;
      } else {
        l = parseFloat(lStr);
      }

      let a = 0;
      let b = 0;

      if (type.toLowerCase() === 'oklch') {
        let c = 0;
        if (val1Str.endsWith('%')) {
          c = (parseFloat(val1Str) / 100) * 0.4;
        } else {
          c = parseFloat(val1Str);
        }

        let h = 0;
        if (val2Str.endsWith('deg')) {
          h = parseFloat(val2Str);
        } else if (val2Str.endsWith('rad')) {
          h = parseFloat(val2Str) * (180 / Math.PI);
        } else if (val2Str.endsWith('turn')) {
          h = parseFloat(val2Str) * 360;
        } else {
          h = parseFloat(val2Str);
        }

        a = c * Math.cos(h * Math.PI / 180);
        b = c * Math.sin(h * Math.PI / 180);
      } else {
        // oklab
        if (val1Str.endsWith('%')) {
          a = (parseFloat(val1Str) / 100) * 0.4;
        } else {
          a = parseFloat(val1Str);
        }

        if (val2Str.endsWith('%')) {
          b = (parseFloat(val2Str) / 100) * 0.4;
        } else {
          b = parseFloat(val2Str);
        }
      }

      // Parse Alpha
      let alphaVal = 1;
      if (alphaPart) {
        if (alphaPart.endsWith('%')) {
          alphaVal = parseFloat(alphaPart) / 100;
        } else if (alphaPart.includes('var(')) {
          alphaVal = 1;
        } else {
          alphaVal = parseFloat(alphaPart);
        }
      } else if (coords[3]) {
        const aStr = coords[3];
        if (aStr.endsWith('%')) {
          alphaVal = parseFloat(aStr) / 100;
        } else if (!aStr.includes('var(')) {
          alphaVal = parseFloat(aStr);
        }
      }

      if (isNaN(alphaVal)) alphaVal = 1;

      // Convert OKLab to LMS
      const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
      const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
      const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
      
      const l_3 = l_ * l_ * l_;
      const m_3 = m_ * m_ * m_;
      const s_3 = s_ * s_ * s_;
      
      // Convert LMS to sRGB
      const r = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
      const g = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
      const b_ = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076147010 * s_3;
      
      const compress = (x: number) => {
        return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
      };
      
      const r_compressed = Math.round(Math.max(0, Math.min(1, compress(r))) * 255);
      const g_compressed = Math.round(Math.max(0, Math.min(1, compress(g))) * 255);
      const b_compressed = Math.round(Math.max(0, Math.min(1, compress(b_))) * 255);

      if (isNaN(r_compressed) || isNaN(g_compressed) || isNaN(b_compressed)) {
        return 'rgb(100, 116, 139)';
      }
      
      return `rgba(${r_compressed}, ${g_compressed}, ${b_compressed}, ${alphaVal})`;
    } catch {
      return 'rgb(120, 120, 120)';
    }
  };

  while (true) {
    const match = result.match(/(oklch|oklab)\(/i);
    if (!match) break;

    const startIndex = match.index!;
    const type = match[1].toLowerCase();

    let parenCount = 1;
    let endIndex = -1;
    const searchStart = startIndex + type.length + 1;

    for (let i = searchStart; i < result.length; i++) {
      if (result[i] === '(') {
        parenCount++;
      } else if (result[i] === ')') {
        parenCount--;
        if (parenCount === 0) {
          endIndex = i;
          break;
        }
      }
    }

    if (endIndex === -1) {
      const nextCharIndex = startIndex + type.length;
      result = result.substring(0, startIndex) + "rgb(120, 120, 120" + result.substring(nextCharIndex);
      continue;
    }

    const content = result.substring(searchStart, endIndex);
    const convertedColor = convertColorContentToRgb(type, content);

    result = result.substring(0, startIndex) + convertedColor + result.substring(endIndex + 1);
  }

  return result;
};

if (typeof window !== 'undefined') {
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (elt, pseudoElt) {
    const style = originalGetComputedStyle.call(window, elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop, receiver) {
        if (prop === 'getPropertyValue') {
          return function (name: string) {
            const val = target.getPropertyValue(name);
            if (val && typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('OKLCH') || val.includes('OKLAB'))) {
              return parseModernColorsAndConvert(val);
            }
            return val;
          };
        }
        const val = target[prop as any];
        if (typeof val === 'function') {
          return val.bind(target);
        }
        if (val && typeof val === 'string' && (val.includes('oklch') || val.includes('oklab') || val.includes('OKLCH') || val.includes('OKLAB'))) {
          return parseModernColorsAndConvert(val);
        }
        return val;
      }
    });
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
