---
description: 'Comprehensive Power BI custom visuals development guide covering React, D3.js integration, TypeScript patterns, testing frameworks, and advanced visualization techniques.'
applyTo: '**/*.{ts,tsx,js,jsx,json,less,css}'
---

# Power BI Custom Visuals Development Best Practices

## Overview
This document provides comprehensive instructions for developing custom Power BI visuals using modern web technologies including React, D3.js, TypeScript, and advanced testing frameworks, based on Microsoft's official guidance and community best practices.

## Development Environment Setup

### 1. Project Initialization
```typescript
// Install Power BI visuals tools globally
npm install -g powerbi-visuals-tools

// Create new visual project
pbiviz new MyCustomVisual
cd MyCustomVisual

// Start development server
pbiviz start
```

### 2. TypeScript Configuration
```json
{
    "compilerOptions": {
        "jsx": "react",
        "types": ["react", "react-dom"],
        "allowJs": false,
        "emitDecoratorMetadata": true,
        "experimentalDecorators": true,
        "target": "es6",
        "sourceMap": true,
        "outDir": "./.tmp/build/",
        "moduleResolution": "node",
        "declaration": true,
        "lib": [
            "es2015",
            "dom"
        ]
    },
    "files": [
        "./src/visual.ts"
    ]
}
```

## Core Visual Development Patterns

### 1. Basic Visual Structure
```typescript
"use strict";
import powerbi from "powerbi-visuals-api";

import DataView = powerbi.DataView;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual = powerbi.extensibility.visual.IVisual;
import IVisualHost = powerbi.extensibility.IVisualHost;

import "./../style/visual.less";

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;
    }

    public update(options: VisualUpdateOptions) {
        const dataView: DataView = options.dataViews[0];
        
        if (!dataView) {
            return;
        }

        // Visual update logic here
    }

    public getFormattingModel(): powerbi.visuals.FormattingModel {
        return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
    }
}
```

### 2. Data View Processing
```typescript
// Single data mapping example
export class Visual implements IVisual {
    private valueText: HTMLParagraphElement;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;
        this.valueText = document.createElement("p");
        this.target.appendChild(this.valueText);
    }

    public update(options: VisualUpdateOptions) {
        const dataView: DataView = options.dataViews[0];
        const singleDataView: DataViewSingle = dataView.single;

        if (!singleDataView || !singleDataView.value ) {
            return;
        }

        this.valueText.innerText = singleDataView.value.toString();
    }
}
```

## React Integration

### 1. React Visual Setup
```typescript
import * as React from "react";
import * as ReactDOM from "react-dom";
import ReactCircleCard from "./component";

export class Visual implements IVisual {
    private target: HTMLElement;
    private reactRoot: React.ComponentElement<any, any>;

    constructor(options: VisualConstructorOptions) {
        this.reactRoot = React.createElement(ReactCircleCard, {});
        this.target = options.element;

        ReactDOM.render(this.reactRoot, this.target);
    }

    public update(options: VisualUpdateOptions) {
        const dataView: DataView = options.dataViews[0];
        
        if (dataView) {
            const reactProps = this.parseDataView(dataView);
            this.reactRoot = React.createElement(ReactCircleCard, reactProps);
            ReactDOM.render(this.reactRoot, this.target);
        }
    }

    private parseDataView(dataView: DataView): any {
        // Transform Power BI data for React component
        return {
            data: dataView.categorical?.values?.[0]?.values || [],
            categories: dataView.categorical?.categories?.[0]?.values || []
        };
    }
}
```

### 2. React Component with Props
```typescript
// React component for Power BI visual
import * as React from "react";

export interface ReactCircleCardProps {
    data: number[];
    categories: string[];
    size?: number;
    color?: string;
}

export const ReactCircleCard: React.FC<ReactCircleCardProps> = (props) => {
    const { data, categories, size = 200, color = "#3498db" } = props;
    
    const maxValue = Math.max(...data);
    const minValue = Math.min(...data);
    
    return (
        <div className="react-circle-card">
            {data.map((value, index) => {
                const radius = ((value - minValue) / (maxValue - minValue)) * size / 2;
                return (
                    <div key={index} className="data-point">
                        <div 
                            className="circle"
                            style={{
                                width: radius * 2,
                                height: radius * 2,
                                backgroundColor: color,
                                borderRadius: '50%'
                            }}
                        />
                        <span className="label">{categories[index]}: {value}</span>
                    </div>
                );
            })}
        </div>
    );
};

export default ReactCircleCard;
```

## D3.js Integration

### 1. D3 with TypeScript
```typescript
import * as d3 from "d3";
type Selection<T extends d3.BaseType> = d3.Selection<T, any, any, any>;

export class Visual implements IVisual {
    private svg: Selection<SVGElement>;
    private container: Selection<SVGElement>;
    private host: IVisualHost;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.svg = d3.select(options.element)
            .append('svg')
            .classed('visual-svg', true);
        
        this.container = this.svg
            .append('g')
            .classed('visual-container', true);
    }

    public update(options: VisualUpdateOptions) {
        const dataView = options.dataViews[0];
        
        if (!dataView) {
            return;
        }

        const width = options.viewport.width;
        const height = options.viewport.height;
        
        this.svg
            .attr('width', width)
            .attr('height', height);

        // D3 data binding and visualization logic
        this.renderChart(dataView, width, height);
    }

    private renderChart(dataView: DataView, width: number, height: number): void {
        const data = this.transformData(dataView);
        
        // Create scales
        const xScale = d3.scaleBand()
            .domain(data.map(d => d.category))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .range([height, 0]);

        // Bind data and create bars
        const bars = this.container.selectAll('.bar')
            .data(data);

        bars.enter()
            .append('rect')
            .classed('bar', true)
            .merge(bars)
            .attr('x', d => xScale(d.category))
            .attr('y', d => yScale(d.value))
            .attr('width', xScale.bandwidth())
            .attr('height', d => height - yScale(d.value))
            .style('fill', '#3498db');

        bars.exit().remove();
    }

    private transformData(dataView: DataView): any[] {
        // Transform Power BI DataView to D3-friendly format
        const categorical = dataView.categorical;
        const categories = categorical.categories[0];
        const values = categorical.values[0];

        return categories.values.map((category, index) => ({
            category: category.toString(),
            value: values.values[index] as number
        }));
    }
}
```

### 2. Advanced D3 Patterns
```typescript
// Complex D3 visualization with interactions
export class AdvancedD3Visual implements IVisual {
    private svg: Selection<SVGElement>;
    private tooltip: Selection<HTMLDivElement>;
    private selectionManager: ISelectionManager;

    constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        
        // Create main SVG
        this.svg = d3.select(options.element)
            .append('svg');
        
        // Create tooltip
        this.tooltip = d3.select(options.element)
            .append('div')
            .classed('tooltip', true)
            .style('opacity', 0);
    }

    private createInteractiveElements(data: VisualDataPoint[]): void {
        const circles = this.svg.selectAll('.data-circle')
            .data(data);

        const circlesEnter = circles.enter()
            .append('circle')
            .classed('data-circle', true);

        circlesEnter.merge(circles)
            .attr('cx', d => d.x)
            .attr('cy', d => d.y)
            .attr('r', d => d.radius)
            .style('fill', d => d.color)
            .style('stroke', d => d.strokeColor)
            .style('stroke-width', d => `${d.strokeWidth}px`)
            .on('click', (event, d) => {
                // Handle selection
                this.selectionManager.select(d.selectionId, event.ctrlKey);
            })
            .on('mouseover', (event, d) => {
                // Show tooltip
                this.tooltip
                    .style('opacity', 1)
                    .style('left', (event.pageX + 10) + 'px')
                    .style('top', (event.pageY - 10) + 'px')
                    .html(`${d.category}: ${d.value}`);
            })
            .on('mouseout', () => {
                // Hide tooltip
                this.tooltip.style('opacity', 0);
            });

        circles.exit().remove();
    }
}
```

## Advanced Visual Features

### 1. Custom Formatting Model
```typescript
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

export class VisualFormattingSettingsModel extends formattingSettings.CompositeFormattingSettingsModel {
    // Color settings card
    public colorCard: ColorCardSettings = new ColorCardSettings();
    
    // Data point settings card  
    public dataPointCard: DataPointCardSettings = new DataPointCardSettings();
    
    // General settings card
    public generalCard: GeneralCardSettings = new GeneralCardSettings();

    public cards: formattingSettings.SimpleCard[] = [this.colorCard, this.dataPointCard, this.generalCard];
}

export class ColorCardSettings extends formattingSettings.SimpleCard {
    name: string = "colorCard";
    displayName: string = "Color";

    public defaultColor: formattingSettings.ColorPicker = new formattingSettings.ColorPicker({
        name: "defaultColor",
        displayName: "Default color",
        value: { value: "#3498db" }
    });

    public showAllDataPoints: formattingSettings.ToggleSwitch = new formattingSettings.ToggleSwitch({
        name: "showAllDataPoints",
        displayName: "Show all",
        value: false
    });
}
```

### 2. Interactivity and Selections
```typescript
import { interactivitySelectionService, baseBehavior } from "powerbi-visuals-utils-interactivityutils";

export interface VisualDataPoint extends interactivitySelectionService.SelectableDataPoint {
    value: powerbi.PrimitiveValue;
    category: string;
    color: string;
    selectionId: ISelectionId;
}

export class VisualBehavior extends baseBehavior.BaseBehavior<VisualDataPoint> {
    protected bindClick() {
        // Implement click behavior for data point selection
        this.behaviorOptions.clearCatcher.on('click', () => {
            this.selectionHandler.handleClearSelection();
        });

        this.behaviorOptions.elementsSelection.on('click', (event, dataPoint) => {
            event.stopPropagation();
            this.selectionHandler.handleSelection(dataPoint, event.ctrlKey);
        });
    }

    protected bindContextMenu() {
        // Implement context menu behavior
        this.behaviorOptions.elementsSelection.on('contextmenu', (event, dataPoint) => {
            this.selectionHandler.handleContextMenu(
                dataPoint ? dataPoint.selectionId : null,
                {
                    x: event.clientX,
                    y: event.clientY
                }
            );
            event.preventDefault();
        });
    }
}
```

### 3. Landing Page Implementation
```typescript
export class Visual implements IVisual {
    private element: HTMLElement;
    private isLandingPageOn: boolean;
    private LandingPageRemoved: boolean;
    private LandingPage: d3.Selection<any>;

    constructor(options: VisualConstructorOptions) {
        this.element = options.element;
    }

    public update(options: VisualUpdateOptions) {
        this.HandleLandingPage(options);
    }

    private HandleLandingPage(options: VisualUpdateOptions) {
        if(!options.dataViews || !options.dataViews[0]?.metadata?.columns?.length){
            if(!this.isLandingPageOn) {
                this.isLandingPageOn = true;
                const SampleLandingPage: Element = this.createSampleLandingPage();
                this.element.appendChild(SampleLandingPage);
                this.LandingPage = d3.select(SampleLandingPage);
            }
        } else {
            if(this.isLandingPageOn && !this.LandingPageRemoved){
                this.LandingPageRemoved = true;
                this.LandingPage.remove();
            }
        }
    }

    private createSampleLandingPage(): Element {
        const landingPage = document.createElement("div");
        landingPage.className = "landing-page";
        landingPage.innerHTML = `
            <div class="landing-page-content">
                <h2>Custom Visual</h2>
                <p>Add data to get started</p>
                <div class="landing-page-icon">📊</div>
            </div>
        `;
        return landingPage;
    }
}
```

## Testing Framework

### 1. Unit Testing Setup
```typescript
// Webpack configuration for testing
const path = require('path');
const webpack = require("webpack");

module.exports = {
    devtool: 'source-map',
    mode: 'development',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.json$/,
                loader: 'json-loader'
            },
            {
                test: /\.tsx?$/i,
                enforce: 'post',
                include: path.resolve(__dirname, 'src'),
                exclude: /(node_modules|resources\/js\/vendor)/,
                loader: 'coverage-istanbul-loader',
                options: { esModules: true }
            }
        ]
    },
    externals: {
        "powerbi-visuals-api": '{}'
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.css']
    },
    output: {
        path: path.resolve(__dirname, ".tmp/test")
    },
    plugins: [
        new webpack.ProvidePlugin({
            'powerbi-visuals-api': null
        })
    ]
};
```

### 2. Visual Testing Utilities
```typescript
// Test utilities for Power BI visuals
export class VisualTestUtils {
    public static d3Click(element: JQuery, x: number, y: number): void {
        const event = new MouseEvent('click', {
            clientX: x,
            clientY: y,
            button: 0
        });
        element[0].dispatchEvent(event);
    }

    public static d3KeyEvent(element: JQuery, typeArg: string, keyArg: string, keyCode: number): void {
        const event = new KeyboardEvent(typeArg, {
            key: keyArg,
            code: keyArg,
            keyCode: keyCode
        });
        element[0].dispatchEvent(event);
    }

    public static createVisualHost(): IVisualHost {
        return {
            createSelectionIdBuilder: () => new SelectionIdBuilder(),
            createSelectionManager: () => new SelectionManager(),
            colorPalette: new ColorPalette(),
            eventService: new EventService(),
            tooltipService: new TooltipService()
        } as IVisualHost;
    }

    public static createUpdateOptions(dataView: DataView, viewport?: IViewport): VisualUpdateOptions {
        return {
            dataViews: [dataView],
            viewport: viewport || { width: 500, height: 500 },
            operationKind: VisualDataChangeOperationKind.Create,
            type: VisualUpdateType.Data
        };
    }
}
```

### 3. Component Testing
```typescript
// Jest test for React component
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReactCircleCard from '../src/component';

describe('ReactCircleCard', () => {
    const mockProps = {
        data: [10, 20, 30],
        categories: ['A', 'B', 'C'],
        size: 200,
        color: '#3498db'
    };

    test('renders with correct data points', () => {
        render(<ReactCircleCard {...mockProps} />);
        
        expect(screen.getByText('A: 10')).toBeInTheDocument();
        expect(screen.getByText('B: 20')).toBeInTheDocument();
        expect(screen.getByText('C: 30')).toBeInTheDocument();
    });

    test('applies correct styling', () => {
        render(<ReactCircleCard {...mockProps} />);
        
        const circles = document.querySelectorAll('.circle');
        expect(circles).toHaveLength(3);
        
        circles.forEach(circle => {
            expect(circle).toHaveStyle('backgroundColor: #3498db');
            expect(circle).toHaveStyle('borderRadius: 50%');
        });
    });

    test('handles empty data gracefully', () => {
        const emptyProps = { ...mockProps, data: [], categories: [] };
        const { container } = render(<ReactCircleCard {...emptyProps} />);
        
        expect(container.querySelector('.data-point')).toBeNull();
    });
});
```

## Advanced Patterns

### 1. Dialog Box Implementation
```typescript
import DialogConstructorOptions = powerbi.extensibility.visual.DialogConstructorOptions;
import DialogAction = powerbi.DialogAction;
import * as ReactDOM from 'react-dom';
import * as React from 'react';

export class CustomDialog {
    private dialogContainer: HTMLElement;

    constructor(options: DialogConstructorOptions) {
        this.dialogContainer = options.element;
        this.initializeDialog();
    }

    private initializeDialog(): void {
        const dialogContent = React.createElement(DialogContent, {
            onSave: this.handleSave.bind(this),
            onCancel: this.handleCancel.bind(this)
        });

        ReactDOM.render(dialogContent, this.dialogContainer);
    }

    private handleSave(data: any): void {
        // Process save action
        this.closeDialog(DialogAction.Save, data);
    }

    private handleCancel(): void {
        // Process cancel action
        this.closeDialog(DialogAction.Cancel);
    }

    private closeDialog(action: DialogAction, data?: any): void {
        // Close dialog with action and optional data
        powerbi.extensibility.visual.DialogUtils.closeDialog(action, data);
    }
}
```

### 2. Conditional Formatting Integration
```typescript
import powerbiVisualsApi from "powerbi-visuals-api";
import { ColorHelper } from "powerbi-visuals-utils-colorutils";

export class Visual implements IVisual {
    private colorHelper: ColorHelper;

    constructor(options: VisualConstructorOptions) {
        this.colorHelper = new ColorHelper(
            options.host.colorPalette,
            { objectName: "dataPoint", propertyName: "fill" },
            "#3498db"  // Default color
        );
    }

    private applyConditionalFormatting(dataPoints: VisualDataPoint[]): VisualDataPoint[] {
        return dataPoints.map(dataPoint => {
            // Get conditional formatting color
            const color = this.colorHelper.getColorForDataPoint(dataPoint.dataViewObject);
            
            return {
                ...dataPoint,
                color: color,
                strokeColor: this.darkenColor(color, 0.2),
                strokeWidth: 2
            };
        });
    }

    private darkenColor(color: string, amount: number): string {
        // Utility function to darken a color for stroke
        const colorObj = d3.color(color);
        return colorObj ? colorObj.darker(amount).toString() : color;
    }
}
```

### 3. Tooltip Integration
```typescript
import { createTooltipServiceWrapper, TooltipEventArgs, ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";

export class Visual implements IVisual {
    private tooltipServiceWrapper: ITooltipServiceWrapper;

    constructor(options: VisualConstructorOptions) {
        this.tooltipServiceWrapper = createTooltipServiceWrapper(
            options.host.tooltipService,
            options.element
        );
    }

    private addTooltips(selection: d3.Selection<any, VisualDataPoint, any, any>): void {
        this.tooltipServiceWrapper.addTooltip(
            selection,
            (tooltipEvent: TooltipEventArgs<VisualDataPoint>) => {
                const dataPoint = tooltipEvent.data;
                return [
                    {
                        displayName: "Category",
                        value: dataPoint.category
                    },
                    {
                        displayName: "Value", 
                        value: dataPoint.value.toString()
                    },
                    {
                        displayName: "Percentage",
                        value: `${((dataPoint.value / this.totalValue) * 100).toFixed(1)}%`
                    }
                ];
            }
        );
    }
}
```

## Performance Optimization

### 1. Data Reduction Strategies
```json
// Visual capabilities with data reduction
"dataViewMappings": {
    "categorical": {
        "categories": {
            "for": { "in": "category" },
            "dataReductionAlgorithm": {
                "window": {
                    "count": 300
                }
            }  
        },
        "values": {
            "group": {
                "by": "series",
                "select": [{
                    "for": {
                        "in": "measure"
                    }
                }],
                "dataReductionAlgorithm": {
                    "top": {
                        "count": 100
                    }
                }  
            }
        }
    }
}
```

### 2. Efficient Rendering Patterns
```typescript
export class OptimizedVisual implements IVisual {
    private animationFrameId: number;
    private renderQueue: (() => void)[] = [];

    public update(options: VisualUpdateOptions) {
        // Queue render operation instead of immediate execution
        this.queueRender(() => this.performUpdate(options));
    }

    private queueRender(renderFunction: () => void): void {
        this.renderQueue.push(renderFunction);
        
        if (!this.animationFrameId) {
            this.animationFrameId = requestAnimationFrame(() => {
                this.processRenderQueue();
            });
        }
    }

    private processRenderQueue(): void {
        // Process all queued render operations
        while (this.renderQueue.length > 0) {
            const renderFunction = this.renderQueue.shift();
            if (renderFunction) {
                renderFunction();
            }
        }
        
        this.animationFrameId = null;
    }

    private performUpdate(options: VisualUpdateOptions): void {
        // Use virtual DOM or efficient diffing strategies
        const currentData = this.transformData(options.dataViews[0]);
        
        if (this.hasDataChanged(currentData)) {
            this.renderVisualization(currentData);
            this.previousData = currentData;
        }
    }

    private hasDataChanged(newData: any[]): boolean {
        // Efficient data comparison
        return JSON.stringify(newData) !== JSON.stringify(this.previousData);
    }
}
```

Remember: Custom visual development requires understanding both Power BI's visual framework and modern web development practices. Focus on creating reusable, testable, and performant visualizations that enhance the Power BI ecosystem.