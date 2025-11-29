---
mode: 'agent'
description: 'Add content (items, data) to a SynergyMesh application'
tools: ['codebase', 'editFiles']
---

# Add Content to SynergyMesh App

Add new content items or data files to an existing SynergyMesh application.

## Content Details

**App**: {{appName}}
**Content Type**: {{contentType}} (text-items / images / JSON-data / custom)
**Description**: {{description}}

## Implementation Steps

### For JSON Content Files

1. **Create content JSON file** in `apps/{{appName}}/web/contents/`:
   ```json
   {
       "title": "{{contentTitle}}",
       "items": [
           {
               "id": "item-1",
               "type": "text",
               "content": "Sample content",
               "position": { "x": 100, "y": 100 }
           }
       ],
       "metadata": {
           "author": "",
           "created": "{{date}}",
           "description": "{{description}}"
       }
   }
   ```

2. **Add content loader** to the app:
   ```typescript
   private async loadContent(contentName: string): Promise<ContentData> {
       const response = await fetch(`contents/${contentName}.json`);
       return response.json();
   }
   ```

3. **Render content items** using D3:
   ```typescript
   private renderItems(items: ContentItem[]): void {
       const selection = d3.select('#container')
           .selectAll('.content-item')
           .data(items, d => d.id);
       
       selection.enter()
           .append('div')
           .attr('class', 'content-item')
           .each(function(d) {
               // Initialize item based on type
           });
   }
   ```

### For Image Content

1. **Add images** to `apps/{{appName}}/web/images/`

2. **Reference in CSS or HTML**:
   ```css
   .item-background {
       background-image: url('images/{{imageName}}.png');
   }
   ```

3. **Preload images** if needed:
   ```typescript
   private preloadImages(urls: string[]): Promise<void[]> {
       return Promise.all(urls.map(url => {
           return new Promise((resolve, reject) => {
               const img = new Image();
               img.onload = () => resolve();
               img.onerror = reject;
               img.src = url;
           });
       }));
   }
   ```

### For Text Items

1. **Use TextItem class** from `common/src/items/text_item.ts`

2. **Create text items**:
   ```typescript
   import { TextItem } from '../../common/src/items/text_item';
   
   private createTextItems(texts: string[]): void {
       texts.forEach((text, index) => {
           const item = new TextItem({
               id: `text-${index}`,
               content: text,
               position: { x: index * 150, y: 100 }
           });
           this.addItem(item);
       });
   }
   ```

## Content Guidelines

- Use unique IDs for all content items
- Include position data for initial layout
- Consider screen/table size for positioning
- Add metadata for content attribution
- Test with touch interactions
