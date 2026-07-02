/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef } from 'react';
import * as Three from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { Zap, Sparkles } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Scroll smoothing
    const lenis = new Lenis();
    lenis.on('scroll', ScrollTrigger.update);
    const updateLenis = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(updateLenis);
    gsap.ticker.lagSmoothing(0);

    // Manual SplitText (simple version)
    const splitText = (selector: string, isLines = false) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((el) => {
        const text = el.textContent || '';
        el.innerHTML = '';
        if (isLines) {
           const span = document.createElement('span');
           span.className = 'line';
           const innerSpan = document.createElement('span');
           innerSpan.textContent = text;
           span.appendChild(innerSpan);
           el.appendChild(span);
        } else {
            text.split('').forEach((char) => {
                const span = document.createElement('span');
                span.className = 'char';
                const innerSpan = document.createElement('span');
                innerSpan.innerHTML = char === ' ' ? '&nbsp;' : char;
                span.appendChild(innerSpan);
                el.appendChild(span);
            });
        }
      });
    };

    splitText(".header-1 h1", false);
    splitText(".tooltip .title h2", true);
    splitText(".tooltip .description p", true);

    ScrollTrigger.create({
        trigger: ".product-overview",
        start: "75% bottom",
        onEnter: () => gsap.to(".header-1 h1 .char > span", {
            y: "0%",
            duration: 1, ease: "power3.out",
            stagger: 0.025,
        }),
        onLeaveBack: () => gsap.to(".header-1 h1 .char > span", {
            y: "100%",
            duration: 1,
            ease: "power3.out",
            stagger: 0.025,
        }),
    });

    // Three.js setup
    const scene = new Three.Scene();
    const camera = new Three.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new Three.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = Three.PCFSoftShadowMap;
    renderer.outputColorSpace = Three.SRGBColorSpace;
    renderer.toneMapping = Three.NoToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(renderer.domElement);
    }

    scene.add(new Three.AmbientLight(0xffffff, 0.5));
    
    // Main light from front top right
    const mainLight = new Three.DirectionalLight(0xffffff, 2.5);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    mainLight.shadow.bias = -0.001;
    mainLight.shadow.mapSize.width = 1024;
    mainLight.shadow.mapSize.height = 1024;
    scene.add(mainLight);

    // Fill light from left
    const fillLight = new Three.DirectionalLight(0xaaccff, 1.5);
    fillLight.position.set(-5, 0, 5);
    scene.add(fillLight);

    // Rim light from back to outline the black bottle
    const rimLight = new Three.DirectionalLight(0xffffff, 3.0);
    rimLight.position.set(0, 5, -5);
    scene.add(rimLight);

    let pivot = new Three.Group();
    scene.add(pivot);
    let modelsize: Three.Vector3;
    let loadedModel: Three.Object3D | null = null;

    function setupModel() {
        if (!modelsize) return;
        const isMobile = window.innerWidth < 1000;
        
        pivot.position.set(
            -modelsize.x * 0.4, 
            0, 
            0
        );
        pivot.rotation.z = Three.MathUtils.degToRad(-25);

        const cameraDistance = isMobile ? 1.9 : 1.15;
        camera.position.set(0, 0, Math.max(modelsize.x, modelsize.y, modelsize.z) * cameraDistance);
        camera.lookAt(0, 0, 0);
    }

    const setupWithModel = (model: Three.Object3D) => {
        model.traverse((node: any) => {
            if (node.isMesh && node.material) {
                // Change bottle color to black and adjust material properties
                node.material.color.setHex(0x1a1a1a);
                Object.assign(node.material, {
                    metalness: 0.6,
                    roughness: 0.3,
                    envMapIntensity: 1.0,
                });
            }
        });

        // Normalize model scale to fit nicely on the screen
        const box = new Three.Box3().setFromObject(model);
        const size = box.getSize(new Three.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3.8 / maxDim;
        model.scale.set(scale, scale, scale);

        // Center model relative to pivot
        const newBox = new Three.Box3().setFromObject(model);
        const center = newBox.getCenter(new Three.Vector3());
        model.position.set(-center.x, -center.y, -center.z);
        
        pivot.add(model);
        loadedModel = model;
        
        modelsize = newBox.getSize(new Three.Vector3());
        setupModel();
    };

    new GLTFLoader().load("/bottle.glb", (gltf) => {
        setupWithModel(gltf.scene);
    }, undefined, (error) => {
        console.error("Failed to load /bottle.glb", error);
    });

    let animationFrameId: number;
    function animate() {
        animationFrameId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        setupModel();
    };
    window.addEventListener("resize", handleResize);

    const animeOptions = { duration: 1, ease: "power3.out", stagger: 0.025 };
    const tooltipSelectors = [
        { trigger: 0.65, elements: [".tooltip:nth-child(1) .icon svg", ".tooltip:nth-child(1) .title .line > span", ".tooltip:nth-child(1) .description .line > span"] },
        { trigger: 0.8, elements: [".tooltip:nth-child(2) .icon svg", ".tooltip:nth-child(2) .title .line > span", ".tooltip:nth-child(2) .description .line > span"] }
    ];

    ScrollTrigger.create({
        trigger: ".product-overview",
        start: "top top",
        end: `+=${window.innerHeight * 10}px`,
        pin: true,
        pinSpacing: true,
        scrub: 1,
        onUpdate: ({ progress }) => {
            const headerProgress = Math.max(0, Math.min(1, (progress - 0.05) / 0.3));
            gsap.to(".header-1", {
                xPercent: progress < 0.05 ? 0 : progress > 0.35 ? -100 : -100 * headerProgress,
            });

            const maskSize = progress < 0.2 ? 0 : progress > 0.3 ? 100 : 100 * ((progress - 0.2) / 0.1);
            gsap.to(".circular-mask", {
                clipPath: `circle(${maskSize}% at 50% 50%)`,
            });

            const header2Progress = Math.max(0, Math.min(1, (progress - 0.15) / 0.35));
            const header2XPercent = 100 - 100 * header2Progress;
            gsap.to(".header-2", { xPercent: header2XPercent });

            const scaleX = progress < 0.45 ? 0 : progress > 0.65 ? 100 : 100 * ((progress - 0.45) / 0.2);
            gsap.to(".tooltip .divider", { scaleX: scaleX / 100, ...animeOptions });

            tooltipSelectors.forEach(({ trigger, elements }) => {
                gsap.to(elements, {
                    y: progress >= trigger ? "0%" : "125%",
                    ...animeOptions,
                });
            });

            if (loadedModel) {
                loadedModel.rotation.y = Math.PI * 6 * progress;
            }
        },
    });

    return () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animationFrameId);
        gsap.ticker.remove(updateLenis);
        ScrollTrigger.getAll().forEach(t => t.kill());
        lenis.destroy();
        renderer.dispose();
        if (containerRef.current) {
            containerRef.current.innerHTML = '';
        }
    };
  }, []);

  return (
    <>
      <section className="intro">
        <h1>GRIND doesn't shake. It performs</h1>
      </section>
      <section className="product-overview">
        <div className="header-1"><h1>Every rep Starts Wth</h1></div>
        <div className="model-container" ref={containerRef}></div>
        <div className="header-2"><h1>GRIND Shaker</h1></div>
        <div className="circular-mask"></div>

        <div className="tooltips">
          <div className="tooltip">
            <div className="icon"><Zap className="w-10 h-10" /></div>
            <div className="divider"></div>
            <div className="title"><h2>Fast Mixing</h2></div>
            <div className="description">
              <p>GRIND's unique mixing system ensures your shakes are smooth every time.</p>
            </div>
          </div>

          <div className="tooltip">
            <div className="icon"><Sparkles className="w-10 h-10" /></div>
            <div className="divider"></div>
            <div className="title"><h2>Easy to Clean</h2></div>
            <div className="description">
              <p>Designed with rounded interiors to prevent buildup and make washing a breeze.</p>
            </div>
          </div>
        </div>
      </section>
      <section className="outro">
        <h1>Don't just train - GRIND</h1>
      </section>
    </>
  );
}
