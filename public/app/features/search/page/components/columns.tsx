import React from 'react';
import SVG from 'react-inlinesvg';

import { DataFrameView, DataSourceRef, Field } from '@grafana/data';
import { config, getDataSourceSrv } from '@grafana/runtime';
import { Checkbox, Icon, IconName, TagList } from '@grafana/ui';
import { DefaultCell } from '@grafana/ui/src/components/Table/DefaultCell';

import { LocationInfo } from '../../service';
import { SelectionChecker, SelectionToggle } from '../selection';

import { FieldAccess, TableColumn } from './SearchResultsTable';

export const generateColumns = (
  data: DataFrameView<FieldAccess>,
  isDashboardList: boolean,
  availableWidth: number,
  selection: SelectionChecker | undefined,
  selectionToggle: SelectionToggle | undefined,
  styles: { [key: string]: string },
  tags: string[],
  onTagFilterChange: (tags: string[]) => void,
  onDatasourceChange: (datasource?: string) => void
): TableColumn[] => {
  const columns: TableColumn[] = [];
  const uidField = data.fields.uid!;
  const kindField = data.fields.kind!;
  const access = data.fields;

  availableWidth -= 8; // ???
  let width = 50;

  if (selection && selectionToggle) {
    width = 30;
    columns.push({
      id: `column-checkbox`,
      Header: () => (
        <div className={styles.checkboxHeader}>
          <Checkbox
            onChange={(e) => {
              e.stopPropagation();
              e.preventDefault();
              alert('SELECT ALL!!!');
            }}
          />
        </div>
      ),
      width,
      Cell: (p) => {
        const uid = uidField.values.get(p.row.index);
        const kind = kindField ? kindField.values.get(p.row.index) : 'dashboard'; // HACK for now
        const selected = selection(kind, uid);
        const hasUID = uid != null; // Panels don't have UID! Likely should not be shown on pages with manage options
        return (
          <div {...p.cellProps} className={p.cellStyle}>
            <div className={styles.checkbox}>
              <Checkbox
                disabled={!hasUID}
                value={selected && hasUID}
                onChange={(e) => {
                  selectionToggle(kind, uid);
                }}
              />
            </div>
          </div>
        );
      },
      field: uidField,
    });
    availableWidth -= width;
  }

  // Name column
  width = Math.max(availableWidth * 0.2, 200);
  columns.push({
    Cell: DefaultCell,
    id: `column-name`,
    field: access.name!,
    Header: 'Name',
    accessor: (row: any, i: number) => {
      const name = access.name!.values.get(i);
      return name;
    },
    width,
  });
  availableWidth -= width;

  const TYPE_COLUMN_WIDTH = 130;
  const DATASOURCE_COLUMN_WIDTH = 200;
  const INFO_COLUMN_WIDTH = 100;
  const LOCATION_COLUMN_WIDTH = 200;
  const TAGS_COLUMN_WIDTH = 200;

  width = TYPE_COLUMN_WIDTH;
  if (isDashboardList) {
    columns.push({
      Cell: DefaultCell,
      id: `column-type`,
      field: access.name!,
      Header: 'Type',
      accessor: (row: any, i: number) => {
        return (
          <div className={styles.typeText}>
            <Icon name={'apps'} className={styles.typeIcon} />
            Dashboard
          </div>
        );
      },
      width,
    });
    availableWidth -= width;
  } else {
    columns.push(makeTypeColumn(access.kind, access.type, width, styles.typeText, styles.typeIcon));
    availableWidth -= width;
  }

  // Show datasources if we have any
  if (access.datasource && hasFieldValue(access.datasource)) {
    width = DATASOURCE_COLUMN_WIDTH;
    columns.push(
      makeDataSourceColumn(
        access.datasource,
        width,
        styles.typeIcon,
        styles.datasourceItem,
        styles.invalidDatasourceItem,
        onDatasourceChange
      )
    );
    availableWidth -= width;
  }

  // Show tags if we have any
  if (access.tags && hasFieldValue(access.tags)) {
    width = TAGS_COLUMN_WIDTH;
    columns.push(makeTagsColumn(access.tags, width, styles.tagList, tags, onTagFilterChange));
    availableWidth -= width;
  }

  if (isDashboardList) {
    width = Math.max(availableWidth, INFO_COLUMN_WIDTH);
    columns.push({
      Cell: DefaultCell,
      id: `column-info`,
      field: access.url!,
      Header: 'Info',
      accessor: (row: any, i: number) => {
        const panelCount = access.panelCount?.values.get(i);
        return <div className={styles.infoWrap}>{panelCount != null && <span>Panels: {panelCount}</span>}</div>;
      },
      width: width,
    });
  } else {
    width = Math.max(availableWidth, LOCATION_COLUMN_WIDTH);
    columns.push({
      Cell: DefaultCell,
      id: `column-location`,
      field: access.location ?? access.url,
      Header: 'Location',
      accessor: (row: any, i: number) => {
        const location = access.location?.values.get(i) as LocationInfo[];
        if (location) {
          return (
            <div>
              {location.map((v, id) => (
                <span
                  key={id}
                  className={styles.locationItem}
                  onClick={(e) => {
                    e.preventDefault();
                    alert('CLICK: ' + v.name);
                  }}
                >
                  <Icon name={getIconForKind(v.kind)} /> {v.name}
                </span>
              ))}
            </div>
          );
        }
        return null;
      },
      width: width,
    });
  }

  return columns;
};

function hasFieldValue(field: Field): boolean {
  for (let i = 0; i < field.values.length; i++) {
    const v = field.values.get(i);
    if (v && v.length) {
      return true;
    }
  }
  return false;
}

function getIconForKind(v: string): IconName {
  if (v === 'dashboard') {
    return 'apps';
  }
  if (v === 'folder') {
    return 'folder';
  }
  return 'question-circle';
}

function makeDataSourceColumn(
  field: Field<DataSourceRef[]>,
  width: number,
  iconClass: string,
  datasourceItemClass: string,
  invalidDatasourceItemClass: string,
  onDatasourceChange: (datasource?: string) => void
): TableColumn {
  return {
    Cell: DefaultCell,
    id: `column-datasource`,
    field,
    Header: 'Data source',
    accessor: (row: any, i: number) => {
      const dslist = field.values.get(i);
      if (dslist?.length) {
        const srv = getDataSourceSrv();
        return (
          <div className={datasourceItemClass}>
            {dslist.map((v, i) => {
              const settings = srv.getInstanceSettings(v);
              const icon = settings?.meta?.info?.logos?.small;
              if (icon) {
                return (
                  <span
                    key={i}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onDatasourceChange(settings.uid);
                    }}
                  >
                    <img src={icon} width={14} height={14} title={settings.type} className={iconClass} />
                    {settings.name}
                  </span>
                );
              }
              return (
                <span className={invalidDatasourceItemClass} key={i}>
                  {v.type}
                </span>
              );
            })}
          </div>
        );
      }
      return null;
    },
    width,
  };
}

function makeTypeColumn(
  kindField: Field<string>,
  typeField: Field<string>,
  width: number,
  typeTextClass: string,
  iconClass: string
): TableColumn {
  return {
    Cell: DefaultCell,
    id: `column-type`,
    field: kindField ?? typeField,
    Header: 'Type',
    accessor: (row: any, i: number) => {
      const kind = kindField?.values.get(i) ?? 'dashboard';
      let icon = 'public/img/icons/unicons/apps.svg';
      let txt = 'Dashboard';
      if (kind) {
        txt = kind;
        switch (txt) {
          case 'dashboard':
            txt = 'Dashboard';
            break;

          case 'folder':
            icon = 'public/img/icons/unicons/folder.svg';
            txt = 'Folder';
            break;

          case 'panel':
            icon = 'public/img/icons/unicons/graph-bar.svg';
            const type = typeField.values.get(i);
            if (type) {
              txt = type;
              const info = config.panels[txt];
              if (info?.name) {
                const v = info.info?.logos.small;
                if (v && v.endsWith('.svg')) {
                  icon = v;
                }
                txt = info.name;
              }
            }
            break;
        }
      }

      return (
        <div className={typeTextClass}>
          <SVG src={icon} width={14} height={14} title={txt} className={iconClass} />
          {txt}
        </div>
      );
    },
    width,
  };
}

function makeTagsColumn(
  field: Field<string[]>,
  width: number,
  tagListClass: string,
  currentTagFilter: string[],
  onTagFilterChange: (tags: string[]) => void
): TableColumn {
  const updateTagFilter = (tag: string) => {
    if (!currentTagFilter.includes(tag)) {
      onTagFilterChange([...currentTagFilter, tag]);
    }
  };

  return {
    Cell: DefaultCell,
    id: `column-tags`,
    field: field,
    Header: 'Tags',
    accessor: (row: any, i: number) => {
      const tags = field.values.get(i);
      if (tags) {
        return <TagList className={tagListClass} tags={tags} onClick={updateTagFilter} />;
      }
      return null;
    },
    width,
  };
}
