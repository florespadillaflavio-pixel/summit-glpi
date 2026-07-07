/* eslint-disable */
// Summit GLPI · Design Canvas entry point

const { useState, useEffect } = React;

const SCREENS = [
  // section, [{id, label, w, h, comp}]
  { id:"auth", title:"01 · Autenticación", subtitle:"Login, recuperación y cambio de contraseña temporal",
    boards:[
      { id:"login",   label:"Login · SSO + credenciales",     w:1440, h:900, Comp: () => <ScreenLogin/> },
      { id:"recover", label:"Recuperar contraseña",           w:1440, h:900, Comp: () => <ScreenRecover/> },
      { id:"change",  label:"Cambio de contraseña temporal",  w:1440, h:900, Comp: () => <ScreenChangePassword/> },
    ]
  },
  { id:"dashboard", title:"02 · Dashboard", subtitle:"Vista ejecutiva (KPIs + gráficas) y vista operativa (kanban)",
    boards:[
      { id:"dash-exec", label:"Variante A · Ejecutivo · KPIs + gráficas",  w:1440, h:1280, Comp: () => <ScreenDashboard/> },
      { id:"dash-ops",  label:"Variante B · Centro de mando · Técnico",     w:1440, h:1080, Comp: () => <ScreenDashboardCompact/> },
    ]
  },
  { id:"helpdesk", title:"03 · Mesa de Ayuda", subtitle:"Tickets — listado, detalle, creación",
    boards:[
      { id:"tk-list",   label:"Listado de tickets · filtros + vistas guardadas", w:1440, h:1080, Comp: () => <ScreenTicketList/> },
      { id:"tk-detail", label:"Detalle de ticket · conversación + SLA + notas internas", w:1440, h:1380, Comp: () => <ScreenTicketDetail/> },
      { id:"tk-create", label:"Nuevo ticket · sugerencias KB",  w:1440, h:1240, Comp: () => <ScreenTicketCreate/> },
    ]
  },
  { id:"cmdb", title:"04 · CMDB / Inventario", subtitle:"Activos, asignaciones, mantenimiento, ubicaciones",
    boards:[
      { id:"as-list",   label:"Listado de activos · vista tabla", w:1440, h:1100, Comp: () => <ScreenAssetList/> },
      { id:"as-detail", label:"Detalle de activo · historial de asignaciones", w:1440, h:1500, Comp: () => <ScreenAssetDetail/> },
      { id:"as-create", label:"Crear activo · 4 pasos", w:1440, h:1280, Comp: () => <ScreenAssetCreate/> },
      { id:"as-loc",    label:"Ubicaciones · árbol jerárquico", w:1440, h:900, Comp: () => <ScreenLocations/> },
    ]
  },
  { id:"kb", title:"05 · Base de Conocimiento", subtitle:"Centro de búsqueda + artículo en lectura",
    boards:[
      { id:"kb-list",    label:"Centro de KB · búsqueda + categorías", w:1440, h:1240, Comp: () => <ScreenKBList/> },
      { id:"kb-article", label:"Artículo KB · lectura + TOC + métricas", w:1440, h:1380, Comp: () => <ScreenKBArticle/> },
    ]
  },
  { id:"admin", title:"06 · Administración", subtitle:"Usuarios, roles & permisos, tenants, catálogos",
    boards:[
      { id:"admin-users",    label:"Usuarios · listado completo", w:1440, h:1000, Comp: () => <ScreenUsers/> },
      { id:"admin-roles",    label:"Roles y permisos · matriz por módulo", w:1440, h:1100, Comp: () => <ScreenRoles/> },
      { id:"admin-tenants",  label:"Tenants · cards + tabla", w:1440, h:1080, Comp: () => <ScreenTenants/> },
      { id:"admin-catalogs", label:"Catálogos dinámicos · grupos + items", w:1440, h:920, Comp: () => <ScreenCatalogs/> },
    ]
  },
  { id:"ops", title:"07 · Contratos, Reportes, Configuración, Auditoría", subtitle:"Operación y gobierno",
    boards:[
      { id:"contracts", label:"Contratos · timeline de renovaciones",  w:1440, h:1080, Comp: () => <ScreenContracts/> },
      { id:"reports",   label:"Reportes programados",                   w:1440, h:1080, Comp: () => <ScreenReports/> },
      { id:"config",    label:"Configuración del tenant",               w:1440, h:1100, Comp: () => <ScreenConfig/> },
      { id:"audit",     label:"Auditoría · log inmutable",              w:1440, h:900, Comp: () => <ScreenAudit/> },
      { id:"profile",   label:"Perfil · información + seguridad + sesiones", w:1440, h:1140, Comp: () => <ScreenProfile/> },
    ]
  },
  { id:"client", title:"08 · Portal del Cliente Final", subtitle:"Vista simplificada para usuarios que solo abren tickets",
    boards:[
      { id:"client-portal", label:"Portal del cliente · solicitudes + catálogo", w:1440, h:1000, Comp: () => <ScreenClientPortal/> },
    ]
  },
];

function App() {
  return (
    <DesignCanvas>
      <DCPostIt x={48} y={48} w={360}>
        <div style={{fontWeight:800,fontSize:18,letterSpacing:"-.01em",color:"#3c2c0a"}}>Summit GLPI · Sistema de Pantallas</div>
        <div style={{fontSize:12.5,marginTop:8,lineHeight:1.5,color:"#5a4a2a"}}>
          21 pantallas hi-fi para Claude Code · Angular + .NET. Multitenant, paleta navy/teal del logo Summit Consulting.
          Cada artboard mapea 1:1 a un endpoint del backend; los componentes están listos para extraer.
        </div>
        <div style={{fontSize:11.5,marginTop:10,color:"#5a4a2a",fontWeight:600,fontFamily:"JetBrains Mono"}}>1440 × var · 8 secciones · 21 artboards</div>
      </DCPostIt>

      {SCREENS.map(sec => (
        <DCSection key={sec.id} id={sec.id} title={sec.title} subtitle={sec.subtitle}>
          {sec.boards.map(b => (
            <DCArtboard key={b.id} id={b.id} label={b.label} width={b.w} height={b.h}>
              <b.Comp/>
            </DCArtboard>
          ))}
        </DCSection>
      ))}
    </DesignCanvas>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
